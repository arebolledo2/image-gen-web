/**
 * Tests for BatchesService
 * Priority: Transaction logic, optimistic concurrency, batch completion calculations
 */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchesService } from '../batches.service';
import { createMockTransaction, createTestBatch } from './test-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $count: vi.fn().mockResolvedValue(0),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      batches: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      batchPrompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      generations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  batches: { id: 'id', name: 'name', createdAt: 'createdAt', status: 'status', version: 'version' },
  batchPrompts: { id: 'id', batchId: 'batchId', order: 'order' },
  generations: { id: 'id', batchId: 'batchId', status: 'status' },
}));

describe('BatchesService', () => {
  let service: BatchesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BatchesService();
  });

  describe('createBatch', () => {
    it('should create batch with prompts atomically in transaction', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn()
        .mockResolvedValueOnce([mockBatch]) // First call for batch
        .mockResolvedValueOnce([{ id: 'bp-1' }]); // Second call for batch prompts

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        batchPrompts: [
          { id: 'bp-1', promptText: 'Test prompt 1', order: 0 },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createBatch({
        name: 'Test Batch',
        prompts: [
          { promptText: 'Test prompt 1' },
        ],
      });

      // Verify transaction was used
      expect(db.transaction).toHaveBeenCalled();

      // Verify batch was inserted
      expect(mockTx.insert).toHaveBeenCalledTimes(2); // Batch + prompts

      // Verify result includes prompts
      expect(result?.batchPrompts).toHaveLength(1);
    });

    it('should throw error if no prompts provided', async () => {
      const mockTx = createMockTransaction();
      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await expect(
        service.createBatch({
          name: 'Test Batch',
          prompts: [],
        })
      ).rejects.toThrow('At least one prompt is required');
    });

    it('should use default provider "gemini" if not specified', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn()
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([{ id: 'bp-1' }]);

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        batchPrompts: [{ id: 'bp-1' }],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.createBatch({
        name: 'Test Batch',
        prompts: [{ promptText: 'Test' }],
      });

      // Check that default provider was set
      const batchValues = mockTx.values.mock.calls[0][0];
      expect(batchValues.provider).toBe('gemini');
      expect(batchValues.status).toBe('draft');
    });

    it('should preserve prompt order', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn()
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([
          { id: 'bp-1', order: 0 },
          { id: 'bp-2', order: 1 },
          { id: 'bp-3', order: 2 },
        ]);

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        batchPrompts: [
          { id: 'bp-1', order: 0 },
          { id: 'bp-2', order: 1 },
          { id: 'bp-3', order: 2 },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.createBatch({
        name: 'Test Batch',
        prompts: [
          { promptText: 'First' },
          { promptText: 'Second' },
          { promptText: 'Third' },
        ],
      });

      // Verify prompts were inserted with correct order
      const promptsValues = mockTx.values.mock.calls[1][0];
      expect(promptsValues).toHaveLength(3);
      expect(promptsValues[0].order).toBe(0);
      expect(promptsValues[1].order).toBe(1);
      expect(promptsValues[2].order).toBe(2);
    });
  });

  describe('updateBatchStatus - OPTIMISTIC CONCURRENCY CONTROL', () => {
    it('should update status successfully when version matches', async () => {
      const mockBatch = createTestBatch({ version: 1 });
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(mockBatch);
      mockTx.update = vi.fn().mockReturnThis();
      mockTx.set = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([{ ...mockBatch, status: 'running' }]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.updateBatchStatus('batch-id', 'running', 1);

      expect(result?.status).toBe('running');
    });

    it('should throw error on version mismatch (CRITICAL FOR CONCURRENCY)', async () => {
      const mockBatch = createTestBatch({ version: 2 });
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(mockBatch);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await expect(
        service.updateBatchStatus('batch-id', 'running', 1) // Expected version 1, actual is 2
      ).rejects.toThrow('Version mismatch: expected 1, got 2');
    });

    it('should set completedAt when status is "completed"', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(mockBatch);
      mockTx.update = vi.fn().mockReturnThis();
      mockTx.set = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([mockBatch]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.updateBatchStatus('batch-id', 'completed');

      const updateData = mockTx.set.mock.calls[0][0];
      expect(updateData.status).toBe('completed');
      expect(updateData.completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when status is "failed"', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(mockBatch);
      mockTx.update = vi.fn().mockReturnThis();
      mockTx.set = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([mockBatch]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.updateBatchStatus('batch-id', 'failed');

      const updateData = mockTx.set.mock.calls[0][0];
      expect(updateData.completedAt).toBeInstanceOf(Date);
    });

    it('should NOT set completedAt for other statuses', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(mockBatch);
      mockTx.update = vi.fn().mockReturnThis();
      mockTx.set = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([mockBatch]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.updateBatchStatus('batch-id', 'running');

      const updateData = mockTx.set.mock.calls[0][0];
      expect(updateData.completedAt).toBeUndefined();
    });

    it('should return undefined if batch not found', async () => {
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(undefined);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.updateBatchStatus('nonexistent-id', 'running');

      expect(result).toBeUndefined();
    });
  });

  describe('createGenerationsForBatch', () => {
    it('should create generations based on prompt count overrides', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        defaults: { count: 1 },
        batchPrompts: [
          { id: 'bp-1', overrides: { count: 3 } }, // Override: 3 generations
          { id: 'bp-2', overrides: {} }, // Default: 1 generation
        ],
      });

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([
        { id: 'gen-1', runNumber: 1 },
        { id: 'gen-2', runNumber: 2 },
        { id: 'gen-3', runNumber: 3 },
        { id: 'gen-4', runNumber: 1 },
      ]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createGenerationsForBatch('batch-id');

      // Should create 4 generations total (3 + 1)
      expect(result).toHaveLength(4);

      // Verify correct run numbers
      const generationsData = mockTx.values.mock.calls[0][0];
      expect(generationsData).toHaveLength(4);
      expect(generationsData[0].runNumber).toBe(1);
      expect(generationsData[1].runNumber).toBe(2);
      expect(generationsData[2].runNumber).toBe(3);
      expect(generationsData[3].runNumber).toBe(1);
    });

    it('should use defaults when no overrides specified', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        defaults: { count: 2 },
        batchPrompts: [
          { id: 'bp-1', overrides: null },
        ],
      });

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([
        { id: 'gen-1', runNumber: 1 },
        { id: 'gen-2', runNumber: 2 },
      ]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createGenerationsForBatch('batch-id');

      expect(result).toHaveLength(2);
    });

    it('should use count of 1 when no defaults or overrides', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        defaults: null,
        batchPrompts: [
          { id: 'bp-1', overrides: null },
        ],
      });

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([
        { id: 'gen-1', runNumber: 1 },
      ]);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createGenerationsForBatch('batch-id');

      expect(result).toHaveLength(1);
    });

    it('should throw error if batch not found', async () => {
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue(undefined);

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await expect(
        service.createGenerationsForBatch('nonexistent-id')
      ).rejects.toThrow('Batch nonexistent-id not found');
    });

    it('should return empty array if no batch prompts', async () => {
      const mockBatch = createTestBatch();
      const mockTx = createMockTransaction();

      mockTx.query.batches.findFirst = vi.fn().mockResolvedValue({
        ...mockBatch,
        batchPrompts: [],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createGenerationsForBatch('batch-id');

      expect(result).toEqual([]);
    });
  });

  describe('getBatchCompletionStatus', () => {
    it('should calculate correct completion statistics', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([
        { id: 'gen-1', status: 'success' },
        { id: 'gen-2', status: 'success' },
        { id: 'gen-3', status: 'running' },
        { id: 'gen-4', status: 'pending' },
        { id: 'gen-5', status: 'failed' },
      ]);

      const result = await service.getBatchCompletionStatus('batch-id');

      expect(result.total).toBe(5);
      expect(result.success).toBe(2);
      expect(result.running).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.isComplete).toBe(false); // Has running/pending
      expect(result.finalStatus).toBe('running');
    });

    it('should handle batch with no generations', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getBatchCompletionStatus('batch-id');

      expect(result.total).toBe(0);
      expect(result.success).toBe(0);
      expect(result.running).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.isComplete).toBe(true); // Empty = complete
      expect(result.finalStatus).toBe('completed');
    });

    it('should mark as complete with finalStatus "failed" when all done but some failed', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([
        { id: 'gen-1', status: 'success' },
        { id: 'gen-2', status: 'failed' },
      ]);

      const result = await service.getBatchCompletionStatus('batch-id');

      expect(result.isComplete).toBe(true);
      expect(result.finalStatus).toBe('failed');
    });

    it('should mark as complete with finalStatus "completed" when all succeeded', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([
        { id: 'gen-1', status: 'success' },
        { id: 'gen-2', status: 'success' },
      ]);

      const result = await service.getBatchCompletionStatus('batch-id');

      expect(result.isComplete).toBe(true);
      expect(result.finalStatus).toBe('completed');
    });
  });

  describe('countBatches', () => {
    it('should return total count of batches', async () => {
      const { db } = await import('@/lib/db');
      db.$count = vi.fn().mockResolvedValue(42);

      const result = await service.countBatches();

      expect(result).toBe(42);
    });
  });
});
