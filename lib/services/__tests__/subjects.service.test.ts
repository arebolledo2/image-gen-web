/**
 * Tests for SubjectsService
 * Priority: Versioning logic, family grouping, favorites, CRUD operations
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubjectsService } from '../subjects.service';
import { createMockTransaction, createTestSubject } from './test-utils';

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
      subjects: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      images: {
        findMany: vi.fn().mockResolvedValue([]),
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
  subjects: {
    id: 'id',
    name: 'name',
    version: 'version',
    parentSubjectId: 'parentSubjectId',
    categoryId: 'categoryId',
    isFavorite: 'isFavorite',
    createdAt: 'createdAt',
  },
  images: { id: 'id', generationId: 'generationId', createdAt: 'createdAt' },
  generations: { id: 'id', batchPromptId: 'batchPromptId' },
  batchPrompts: { id: 'id', promptId: 'promptId' },
  prompts: { id: 'id', subjectId: 'subjectId' },
}));

describe('SubjectsService', () => {
  let service: SubjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubjectsService();
  });

  describe('createSubject', () => {
    it('should create a subject with version 1 and default transparency', async () => {
      const { db } = await import('@/lib/db');
      const newSubject = createTestSubject({ name: 'Robot Turret', isTransparent: true });
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([newSubject]);

      const result = await service.createSubject({
        name: 'Robot Turret',
        description: 'A robot turret character',
      });

      expect(result).toEqual(newSubject);
    });

    it('should respect explicit isTransparent value', async () => {
      const { db } = await import('@/lib/db');
      const newSubject = createTestSubject({ isTransparent: false });
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([newSubject]);

      const result = await service.createSubject({
        name: 'Background Scene',
        isTransparent: false,
      });

      expect(result).toEqual(newSubject);
    });
  });

  describe('createSubjectVersion', () => {
    it('should create version with incremented version number', async () => {
      const { db } = await import('@/lib/db');
      const parent = createTestSubject({ id: 'sub-1', version: 1 });
      const child = createTestSubject({ id: 'sub-2', version: 2, parentSubjectId: 'sub-1' });

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([parent]);
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([child]);

      const result = await service.createSubjectVersion('sub-1', {
        name: 'Updated Subject',
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
        service.createSubjectVersion('nonexistent', { name: 'Test' })
      ).rejects.toThrow('Parent subject nonexistent not found');
    });
  });

  describe('updateSubject', () => {
    it('should update subject fields', async () => {
      const { db } = await import('@/lib/db');
      const updated = createTestSubject({ name: 'Updated Robot' });

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([updated]);

      const result = await service.updateSubject('sub-1', { name: 'Updated Robot' });

      expect(result).toEqual(updated);
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite from false to true', async () => {
      const { db } = await import('@/lib/db');
      const subject = createTestSubject({ id: 'sub-1', isFavorite: false });
      const toggled = createTestSubject({ id: 'sub-1', isFavorite: true });

      // Mock findById
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([subject]);

      // Mock update
      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([toggled]);

      const result = await service.toggleFavorite('sub-1');

      expect(result).toEqual(toggled);
    });

    it('should throw error for nonexistent subject', async () => {
      const { db } = await import('@/lib/db');
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      await expect(
        service.toggleFavorite('nonexistent')
      ).rejects.toThrow('Subject nonexistent not found');
    });
  });

  describe('getSubjectVersions', () => {
    it('should return all versions sorted by version desc', async () => {
      const { db } = await import('@/lib/db');
      const subV1 = createTestSubject({ id: 'sub-1', version: 1, parentSubjectId: null });
      const subV2 = createTestSubject({ id: 'sub-2', version: 2, parentSubjectId: 'sub-1' });
      const subV3 = createTestSubject({ id: 'sub-3', version: 3, parentSubjectId: 'sub-2' });

      // findById uses select().from().where().limit()
      // findAll(false) uses select().from() — resolves from() directly
      let fromCallCount = 0;
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockImplementation(() => {
        fromCallCount++;
        // 4th from() call is findAll(false) — return array directly
        if (fromCallCount === 4) return Promise.resolve([subV1, subV2, subV3]);
        return db; // continue chain for findById
      });
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn()
        .mockResolvedValueOnce([subV3])  // findById for input
        .mockResolvedValueOnce([subV2])  // findById for parent
        .mockResolvedValueOnce([subV1]); // findById for root

      const result = await service.getSubjectVersions('sub-3');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3); // Newest first
      expect(result[2].version).toBe(1);
    });

    it('should return empty array for nonexistent subject', async () => {
      const { db } = await import('@/lib/db');
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      const result = await service.getSubjectVersions('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
