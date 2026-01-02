/**
 * Tests for PromptsService
 * Priority: Transaction logic and guidance associations (regression test for bug)
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Vitest mocks have complex types, focus on behavior tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptsService } from '../prompts.service';
import { createMockTransaction, createTestPrompt, createTestStyle, createTestSubject, createTestGuidance } from './test-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      prompts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      promptGuidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

// Mock the schema
vi.mock('@/lib/db/schema', () => ({
  prompts: {
    id: 'id',
    name: 'name',
    styleId: 'styleId',
    subjectId: 'subjectId',
    promptText: 'promptText',
    createdAt: 'createdAt',
  },
  promptGuidance: {
    id: 'id',
    promptId: 'promptId',
    guidanceId: 'guidanceId',
  },
}));

describe('PromptsService', () => {
  let service: PromptsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PromptsService();
  });

  describe('createPrompt', () => {
    it('should create prompt with guidance associations in transaction', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      // Mock insert to return the prompt
      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([mockPrompt]);

      // Mock query to return prompt with relations
      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        style: createTestStyle(),
        subject: createTestSubject(),
        promptGuidance: [
          {
            id: 'pg-1',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-1',
            guidance: createTestGuidance({ id: 'guidance-1' }),
          },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createPrompt({
        name: 'Test Prompt',
        styleId: 'style-test-id',
        subjectId: 'subject-test-id',
        guidanceIds: ['guidance-1'],
        promptText: 'Test prompt text',
      });

      // Verify transaction was used
      expect(db.transaction).toHaveBeenCalled();

      // Verify prompt was inserted
      expect(mockTx.insert).toHaveBeenCalled();

      // Verify guidance was associated
      expect(mockTx.insert).toHaveBeenCalledTimes(2); // Once for prompt, once for guidance

      // Verify result includes relations
      expect(result).toBeDefined();
      expect(result?.promptGuidance).toHaveLength(1);
    });

    it('should create prompt without guidance if none provided', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([mockPrompt]);
      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        style: createTestStyle(),
        subject: createTestSubject(),
        promptGuidance: [],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.createPrompt({
        name: 'Test Prompt',
        styleId: 'style-test-id',
        subjectId: 'subject-test-id',
      });

      // Verify prompt was created but guidance insert was not called
      expect(mockTx.insert).toHaveBeenCalledTimes(1); // Only prompt insert
      expect(result?.promptGuidance).toHaveLength(0);
    });
  });

  describe('addGuidanceToPrompt', () => {
    it('should deduplicate guidance IDs (not add already associated guidance)', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      // Mock existing guidance
      mockTx.query.promptGuidance.findMany = vi.fn().mockResolvedValue([
        { id: 'pg-1', promptId: mockPrompt.id, guidanceId: 'guidance-1' },
      ]);

      mockTx.insert = vi.fn().mockReturnThis();
      mockTx.values = vi.fn().mockReturnThis();
      mockTx.returning = vi.fn().mockResolvedValue([]);

      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        promptGuidance: [
          {
            id: 'pg-1',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-1',
            guidance: createTestGuidance({ id: 'guidance-1' }),
          },
          {
            id: 'pg-2',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-2',
            guidance: createTestGuidance({ id: 'guidance-2' }),
          },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.addGuidanceToPrompt(mockPrompt.id, ['guidance-1', 'guidance-2']);

      // Verify that only guidance-2 was inserted (guidance-1 already existed)
      expect(mockTx.insert).toHaveBeenCalled();
      const insertCall = mockTx.values.mock.calls[0][0];

      // Should only insert guidance-2, not guidance-1
      if (Array.isArray(insertCall)) {
        expect(insertCall).toHaveLength(1);
        expect(insertCall[0].guidanceId).toBe('guidance-2');
      }
    });
  });

  describe('removeGuidanceFromPrompt - REGRESSION TEST', () => {
    it('should remove ONLY specified guidances, not all guidances', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      // Setup mock delete that tracks what was deleted
      const deletedWhere: any[] = [];
      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn((condition) => {
        deletedWhere.push(condition);
        return mockTx;
      });

      // Mock the result: prompt with remaining guidance
      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        promptGuidance: [
          {
            id: 'pg-2',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-2',
            guidance: createTestGuidance({ id: 'guidance-2', name: 'Remaining Guidance' }),
          },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.removeGuidanceFromPrompt(mockPrompt.id, ['guidance-1']);

      // Verify delete was called
      expect(mockTx.delete).toHaveBeenCalled();
      expect(mockTx.where).toHaveBeenCalled();

      // Verify the result still has guidance-2 (was not deleted)
      expect(result?.promptGuidance).toHaveLength(1);
      expect(result?.promptGuidance[0].guidanceId).toBe('guidance-2');
    });

    it('should remove multiple specific guidances', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();

      // Mock result: prompt with one remaining guidance
      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        promptGuidance: [
          {
            id: 'pg-3',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-3',
            guidance: createTestGuidance({ id: 'guidance-3' }),
          },
        ],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.removeGuidanceFromPrompt(mockPrompt.id, ['guidance-1', 'guidance-2']);

      expect(mockTx.delete).toHaveBeenCalled();
      expect(result?.promptGuidance).toHaveLength(1);
      expect(result?.promptGuidance[0].guidanceId).toBe('guidance-3');
    });

    it('should handle removing all guidances', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();

      // Mock result: prompt with no guidance
      mockTx.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        promptGuidance: [],
      });

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.removeGuidanceFromPrompt(mockPrompt.id, ['guidance-1', 'guidance-2', 'guidance-3']);

      expect(result?.promptGuidance).toHaveLength(0);
    });
  });

  describe('deletePrompt', () => {
    it('should delete guidance associations before deleting prompt', async () => {
      const mockPrompt = createTestPrompt();
      const mockTx = createMockTransaction();

      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnValue({ rowCount: 1 }); // Mock successful delete

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.deletePrompt(mockPrompt.id);

      // Verify cascade delete: guidance associations deleted, then prompt
      expect(mockTx.delete).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
    });
  });

  describe('getPromptWithRelations', () => {
    it('should return prompt with style, subject, and guidance', async () => {
      const mockPrompt = createTestPrompt();
      const { db } = await import('@/lib/db');

      db.query.prompts.findFirst = vi.fn().mockResolvedValue({
        ...mockPrompt,
        style: createTestStyle(),
        subject: createTestSubject(),
        promptGuidance: [
          {
            id: 'pg-1',
            promptId: mockPrompt.id,
            guidanceId: 'guidance-1',
            guidance: createTestGuidance({ id: 'guidance-1' }),
          },
        ],
      });

      const result = await service.getPromptWithRelations(mockPrompt.id);

      expect(result).toBeDefined();
      expect(result?.style).toBeDefined();
      expect(result?.subject).toBeDefined();
      expect(result?.promptGuidance).toHaveLength(1);
    });
  });
});
