/**
 * Tests for GuidanceService
 * Priority: Versioning logic, family grouping, CRUD operations
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuidanceService } from '../guidance.service';
import { createMockTransaction, createTestGuidance } from './test-utils';

// Mock the database
vi.mock('@/lib/db', () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      guidance: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };

  mockDb.select.mockImplementation(() => mockDb);
  mockDb.from.mockImplementation(() => mockDb);
  mockDb.where.mockImplementation(() => mockDb);
  mockDb.orderBy.mockImplementation(() => mockDb);

  return { db: mockDb };
});

vi.mock('@/lib/db/schema', () => ({
  guidance: {
    id: 'id',
    name: 'name',
    version: 'version',
    parentGuidanceId: 'parentGuidanceId',
    createdAt: 'createdAt',
  },
}));

describe('GuidanceService', () => {
  let service: GuidanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GuidanceService();
  });

  describe('getLatestGuidance - VERSIONING LOGIC', () => {
    it('should return only latest version of each guidance family', async () => {
      const { db } = await import('@/lib/db');

      // Guidance family: v1 -> v2
      const guideV1 = createTestGuidance({ id: 'guide-1', version: 1, parentGuidanceId: null });
      const guideV2 = createTestGuidance({ id: 'guide-2', version: 2, parentGuidanceId: 'guide-1' });

      // Separate guidance (no versions)
      const guideIndependent = createTestGuidance({ id: 'guide-3', version: 1, parentGuidanceId: null });

      db.query.guidance.findMany = vi.fn().mockResolvedValue([
        guideV1,
        guideV2,
        guideIndependent,
      ]);

      const result = await service.getLatestGuidance();

      // Should return only v2 (latest) and independent guidance
      expect(result).toHaveLength(2);

      const versions = result.map(g => g.version);
      expect(versions).toContain(2); // Latest of family
      expect(versions).toContain(1); // Independent
    });

    it('should include versionCount for each family', async () => {
      const { db } = await import('@/lib/db');

      const guideV1 = createTestGuidance({ id: 'guide-1', version: 1, parentGuidanceId: null });
      const guideV2 = createTestGuidance({ id: 'guide-2', version: 2, parentGuidanceId: 'guide-1' });
      const guideV3 = createTestGuidance({ id: 'guide-3', version: 3, parentGuidanceId: 'guide-2' });

      db.query.guidance.findMany = vi.fn().mockResolvedValue([guideV1, guideV2, guideV3]);

      const result = await service.getLatestGuidance();

      expect(result).toHaveLength(1);
      expect(result[0].version).toBe(3);
      expect(result[0].versionCount).toBe(3);
    });

    it('should handle empty guidance list', async () => {
      const { db } = await import('@/lib/db');
      db.query.guidance.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getLatestGuidance();

      expect(result).toHaveLength(0);
    });
  });

  describe('createGuidance', () => {
    it('should create guidance with version 1', async () => {
      const { db } = await import('@/lib/db');
      const newGuidance = createTestGuidance({ name: 'Top-down view' });
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([newGuidance]);

      const result = await service.createGuidance({
        name: 'Top-down view',
        description: 'Top-down camera angle',
      });

      expect(result).toEqual(newGuidance);
    });
  });

  describe('createGuidanceVersion', () => {
    it('should create version with incremented version number', async () => {
      const { db } = await import('@/lib/db');
      const parent = createTestGuidance({ id: 'guide-1', version: 1 });
      const child = createTestGuidance({ id: 'guide-2', version: 2, parentGuidanceId: 'guide-1' });

      // Mock findById (uses select chain)
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([parent]);

      // Mock create (uses insert chain)
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([child]);

      const result = await service.createGuidanceVersion('guide-1', {
        name: 'Updated Guidance',
      });

      expect(result).toEqual(child);
    });

    it('should throw error for nonexistent parent', async () => {
      const { db } = await import('@/lib/db');
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      await expect(
        service.createGuidanceVersion('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Parent guidance nonexistent not found');
    });
  });

  describe('updateGuidance', () => {
    it('should update guidance fields', async () => {
      const { db } = await import('@/lib/db');
      const updated = createTestGuidance({ name: 'Updated Name' });

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([updated]);

      const result = await service.updateGuidance('guide-1', { name: 'Updated Name' });

      expect(result).toEqual(updated);
    });
  });

  describe('getGuidanceVersions', () => {
    it('should return all versions sorted by version desc', async () => {
      const { db } = await import('@/lib/db');
      const guideV1 = createTestGuidance({ id: 'guide-1', version: 1, parentGuidanceId: null });
      const guideV2 = createTestGuidance({ id: 'guide-2', version: 2, parentGuidanceId: 'guide-1' });

      // findById uses select().from().where().limit()
      // findAll(false) uses select().from() — which resolves the from() promise
      let fromCallCount = 0;
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockImplementation(() => {
        fromCallCount++;
        // 3rd from() call is findAll(false) — return array directly
        if (fromCallCount === 3) return Promise.resolve([guideV1, guideV2]);
        return db; // continue chain for findById
      });
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn()
        .mockResolvedValueOnce([guideV2])  // findById for input
        .mockResolvedValueOnce([guideV1]); // findById for parent (root)

      const result = await service.getGuidanceVersions('guide-2');

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2); // Newest first
      expect(result[1].version).toBe(1);
    });

    it('should return empty array for nonexistent guidance', async () => {
      const { db } = await import('@/lib/db');
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      const result = await service.getGuidanceVersions('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
