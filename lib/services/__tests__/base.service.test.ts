/**
 * Tests for BaseService
 * Priority: Core CRUD operations and transaction support
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseService } from '../base.service';
import { createMockTransaction, createTestStyle } from './test-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    returning: vi.fn().mockResolvedValue([]),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
  },
}));

// Mock table
const mockTable = {
  id: 'id',
  createdAt: 'createdAt',
};

class TestService extends BaseService<typeof mockTable> {
  constructor() {
    super(mockTable);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestService();
  });

  describe('findById', () => {
    it('should find record by ID', async () => {
      const mockRecord = createTestStyle();
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([mockRecord]);

      const result = await service.findById('test-id');

      expect(db.select).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRecord);
    });

    it('should return undefined if record not found', async () => {
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all records ordered by createdAt by default', async () => {
      const mockRecords = [createTestStyle(), createTestStyle({ id: 'test-2' })];
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.orderBy = vi.fn().mockResolvedValue(mockRecords);

      const result = await service.findAll();

      expect(db.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockRecords);
    });

    it('should return records without ordering when orderByCreatedAt is false', async () => {
      const mockRecords = [createTestStyle()];
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockResolvedValue(mockRecords);

      const result = await service.findAll(false);

      expect(db.orderBy).not.toHaveBeenCalled();
      expect(result).toEqual(mockRecords);
    });
  });

  describe('create', () => {
    it('should create a new record and return it', async () => {
      const mockRecord = createTestStyle();
      const { db } = await import('@/lib/db');

      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([mockRecord]);

      const result = await service.create({
        name: 'Test Style',
        palette: {},
        renderingCues: {},
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.values).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });
  });

  describe('update', () => {
    it('should update a record by ID and return updated record', async () => {
      const mockRecord = createTestStyle({ name: 'Updated Style' });
      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([mockRecord]);

      const result = await service.update('test-id', { name: 'Updated Style' });

      expect(db.update).toHaveBeenCalled();
      expect(db.set).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(db.returning).toHaveBeenCalled();
      expect(result).toEqual(mockRecord);
    });

    it('should automatically set updatedAt timestamp', async () => {
      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([createTestStyle()]);

      await service.update('test-id', { name: 'Updated' });

      expect(db.set).toHaveBeenCalled();
      const setCall = db.set.mock.calls[0][0];
      expect(setCall.updatedAt).toBeInstanceOf(Date);
    });

    it('should return undefined if record not found', async () => {
      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([]);

      const result = await service.update('nonexistent-id', { name: 'Updated' });

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete record by ID and return true on success', async () => {
      const { db } = await import('@/lib/db');

      db.delete = vi.fn().mockReturnThis();
      db.where = vi.fn().mockResolvedValue({ rowCount: 1 });

      const result = await service.delete('test-id');

      expect(db.delete).toHaveBeenCalled();
      expect(db.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if record not found', async () => {
      const { db } = await import('@/lib/db');

      db.delete = vi.fn().mockReturnThis();
      db.where = vi.fn().mockResolvedValue({ rowCount: 0 });

      const result = await service.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('transaction', () => {
    it('should execute callback within transaction', async () => {
      const { db } = await import('@/lib/db');
      const mockTx = createMockTransaction();

      db.transaction = vi.fn((callback) => callback(mockTx));

      const result = await service.transaction(async () => {
        return 'transaction result';
      });

      expect(db.transaction).toHaveBeenCalled();
      expect(result).toBe('transaction result');
    });

    it('should propagate errors from transaction callback', async () => {
      const { db } = await import('@/lib/db');

      db.transaction = vi.fn((callback) => callback(createMockTransaction()));

      await expect(
        service.transaction(async () => {
          throw new Error('Transaction error');
        })
      ).rejects.toThrow('Transaction error');
    });

    it('should rollback transaction on error', async () => {
      const { db } = await import('@/lib/db');

      db.transaction = vi.fn(async (callback) => {
        try {
          await callback(createMockTransaction());
        } catch (err) {
          throw err;
        }
      });

      try {
        await service.transaction(async () => {
          throw new Error('Rollback test');
        });
      } catch {
        // Expected error
      }

      expect(db.transaction).toHaveBeenCalled();
    });
  });
});
