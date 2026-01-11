/**
 * Tests for StylesService
 * Priority: Versioning logic, family grouping, cascade operations
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StylesService } from '../styles.service';
import { createMockTransaction, createTestStyle } from './test-utils';

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
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      styles: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };

  // Make select, from, where, orderBy return mockDb for chaining
  mockDb.select.mockImplementation(() => mockDb);
  mockDb.from.mockImplementation(() => mockDb);
  mockDb.where.mockImplementation(() => mockDb);
  mockDb.orderBy.mockImplementation(() => mockDb);

  return { db: mockDb };
});

vi.mock('@/lib/db/schema', () => ({
  styles: {
    id: 'id',
    name: 'name',
    version: 'version',
    parentStyleId: 'parentStyleId',
    createdAt: 'createdAt',
  },
}));

describe('StylesService', () => {
  let service: StylesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StylesService();
  });

  describe('getLatestStyles - VERSIONING LOGIC', () => {
    it('should return only latest version of each style family', async () => {
      const { db } = await import('@/lib/db');

      // Style family: v1 -> v2 -> v3
      const styleV1 = createTestStyle({ id: 'style-1', version: 1, parentStyleId: null });
      const styleV2 = createTestStyle({ id: 'style-2', version: 2, parentStyleId: 'style-1' });
      const styleV3 = createTestStyle({ id: 'style-3', version: 3, parentStyleId: 'style-2' });

      // Separate style (no versions)
      const styleIndependent = createTestStyle({ id: 'style-4', version: 1, parentStyleId: null });

      db.query.styles.findMany = vi.fn().mockResolvedValue([
        styleV1,
        styleV2,
        styleV3,
        styleIndependent,
      ]);

      const result = await service.getLatestStyles();

      // Should return only v3 (latest) and independent style
      expect(result).toHaveLength(2);

      // Find the versioned family
      const versionedFamily = result.find(s => s.id === 'style-3');
      expect(versionedFamily).toBeDefined();
      expect(versionedFamily.version).toBe(3);
      expect(versionedFamily.versionCount).toBe(3);

      // Find the independent style
      const independent = result.find(s => s.id === 'style-4');
      expect(independent).toBeDefined();
      expect(independent.versionCount).toBe(1);
    });

    it('should handle multiple separate style families', async () => {
      const { db } = await import('@/lib/db');

      // Family A: v1 -> v2
      const familyA_v1 = createTestStyle({ id: 'a-1', version: 1, parentStyleId: null });
      const familyA_v2 = createTestStyle({ id: 'a-2', version: 2, parentStyleId: 'a-1' });

      // Family B: v1 -> v2 -> v3
      const familyB_v1 = createTestStyle({ id: 'b-1', version: 1, parentStyleId: null });
      const familyB_v2 = createTestStyle({ id: 'b-2', version: 2, parentStyleId: 'b-1' });
      const familyB_v3 = createTestStyle({ id: 'b-3', version: 3, parentStyleId: 'b-2' });

      db.query.styles.findMany = vi.fn().mockResolvedValue([
        familyA_v1,
        familyA_v2,
        familyB_v1,
        familyB_v2,
        familyB_v3,
      ]);

      const result = await service.getLatestStyles();

      expect(result).toHaveLength(2); // One per family

      const latestA = result.find(s => s.id === 'a-2');
      expect(latestA?.versionCount).toBe(2);

      const latestB = result.find(s => s.id === 'b-3');
      expect(latestB?.versionCount).toBe(3);
    });

    it('should handle broken parent chain gracefully', async () => {
      const { db } = await import('@/lib/db');

      // Broken chain: v2 points to non-existent parent
      const styleV2 = createTestStyle({ id: 'style-2', version: 2, parentStyleId: 'nonexistent' });

      db.query.styles.findMany = vi.fn().mockResolvedValue([styleV2]);

      const result = await service.getLatestStyles();

      // Should still return the style, treating it as root
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('style-2');
    });

    it('should handle empty styles list', async () => {
      const { db } = await import('@/lib/db');

      db.query.styles.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getLatestStyles();

      expect(result).toEqual([]);
    });
  });

  describe('createStyleVersion', () => {
    it('should create new version with incremented version number', async () => {
      const parentStyle = createTestStyle({ id: 'parent-id', version: 1 });
      const newVersion = createTestStyle({ id: 'new-id', version: 2, parentStyleId: 'parent-id' });

      const { db } = await import('@/lib/db');

      // Mock findById to return parent
      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([parentStyle]);

      // Mock insert
      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([newVersion]);

      const result = await service.createStyleVersion('parent-id', {
        name: 'Updated Style',
      });

      expect(result).toBeDefined();
      expect(result.version).toBe(2);
      expect(result.parentStyleId).toBe('parent-id');
    });

    it('should throw error if parent style not found', async () => {
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]); // Parent not found

      await expect(
        service.createStyleVersion('nonexistent-id', { name: 'Updated' })
      ).rejects.toThrow('Parent style nonexistent-id not found');
    });

    it('should preserve parent fields when creating version', async () => {
      const parentStyle = createTestStyle({
        id: 'parent-id',
        version: 1,
        name: 'Original Style',
        palette: { primary: ['#FF0000'] },
        renderingCues: { materials: ['Metal'] },
      });

      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([parentStyle]);

      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([
        {
          ...parentStyle,
          id: 'new-id',
          version: 2,
          name: 'Updated Style',
        },
      ]);

      await service.createStyleVersion('parent-id', {
        name: 'Updated Style',
      });

      // Check that insert was called with parent's fields
      const insertValues = db.values.mock.calls[0][0];
      expect(insertValues.version).toBe(2);
      expect(insertValues.parentStyleId).toBe('parent-id');
      expect(insertValues.palette).toEqual(parentStyle.palette);
      expect(insertValues.renderingCues).toEqual(parentStyle.renderingCues);
    });
  });

  describe('getStyleVersions', () => {
    it('should return all versions in family ordered by version', async () => {
      const styleV1 = createTestStyle({ id: 'v1', version: 1, parentStyleId: null });
      const styleV2 = createTestStyle({ id: 'v2', version: 2, parentStyleId: 'v1' });
      const styleV3 = createTestStyle({ id: 'v3', version: 3, parentStyleId: 'v2' });

      const { db } = await import('@/lib/db');

      // Mock sequential findById calls and findAll
      let findByIdCallCount = 0;
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          findByIdCallCount++;
          if (findByIdCallCount === 1) return Promise.resolve([styleV2]); // Start from v2
          if (findByIdCallCount === 2) return Promise.resolve([styleV1]); // Traverse to v1 (root)
          return Promise.resolve([]);
        }),
      };

      db.select = vi.fn(() => mockChain);
      db.from = vi.fn(() => mockChain);
      db.where = vi.fn(() => mockChain);
      db.orderBy = vi.fn(() => mockChain);
      db.limit = mockChain.limit;

      // For findAll: select().from() should return the styles array
      // When limit is NOT called (findAll case), from() needs to resolve to array
      mockChain.from.mockImplementation(() => {
        // If this is for findAll (no limit will be called after), return a thenable
        const result = Object.assign(Promise.resolve([styleV1, styleV2, styleV3]), mockChain);
        return result;
      });

      // Mock findMany for getting all versions
      db.query.styles.findMany = vi.fn().mockResolvedValue([styleV1, styleV2, styleV3]);

      const result = await service.getStyleVersions('v2');

      expect(result).toHaveLength(3);
      // Should be ordered newest first
      expect(result[0].version).toBe(3);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
    });

    it('should return empty array if style not found', async () => {
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      const result = await service.getStyleVersions('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle single version (no parent/children)', async () => {
      const singleStyle = createTestStyle({ id: 'single', version: 1, parentStyleId: null });

      const { db } = await import('@/lib/db');

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([singleStyle]),
      };

      db.select = vi.fn(() => mockChain);
      db.from = vi.fn(() => mockChain);
      db.where = vi.fn(() => mockChain);
      db.orderBy = vi.fn(() => mockChain);
      db.limit = mockChain.limit;

      // For findAll
      mockChain.from.mockImplementation(() => {
        const result = Object.assign(Promise.resolve([singleStyle]), mockChain);
        return result;
      });

      db.query.styles.findMany = vi.fn().mockResolvedValue([singleStyle]);

      const result = await service.getStyleVersions('single');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('single');
    });
  });

  describe('deleteStyleFamily', () => {
    it('should delete all versions in a style family', async () => {
      const styleV1 = createTestStyle({ id: 'v1', version: 1, parentStyleId: null });
      const styleV2 = createTestStyle({ id: 'v2', version: 2, parentStyleId: 'v1' });
      const styleV3 = createTestStyle({ id: 'v3', version: 3, parentStyleId: 'v2' });

      const { db } = await import('@/lib/db');

      // SELECT chain for findById and findAll
      let findByIdCallCount = 0;
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          findByIdCallCount++;
          if (findByIdCallCount === 1) return Promise.resolve([styleV2]);
          if (findByIdCallCount === 2) return Promise.resolve([styleV1]);
          return Promise.resolve([]);
        }),
      };

      // Make select chain methods return selectChain for proper chaining
      selectChain.select = vi.fn(() => selectChain);
      selectChain.from = vi.fn(() => selectChain);
      selectChain.where = vi.fn(() => selectChain);
      selectChain.orderBy = vi.fn(() => selectChain);

      // For findAll - from() should return a thenable with chain methods
      selectChain.from.mockImplementation(() => {
        const result = Object.assign(Promise.resolve([styleV1, styleV2, styleV3]), selectChain);
        return result;
      });

      // Wire up db.select to use selectChain
      db.select = selectChain.select;

      // DELETE chain for the delete operation (used by transaction)
      const txDeleteChain = {
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };

      // Mock transaction to provide a tx object with delete capability
      let deleteCallCount = 0;
      const mockTx = {
        delete: vi.fn(() => {
          deleteCallCount++;
          return txDeleteChain;
        }),
      };

      db.transaction = vi.fn(async (callback) => {
        return callback(mockTx);
      });

      const result = await service.deleteStyleFamily('v2');

      expect(mockTx.delete).toHaveBeenCalled();
      expect(deleteCallCount).toBe(3); // Should delete 3 styles (v1, v2, v3)
      expect(result).toBe(3); // Deleted 3 styles
    });

    it('should return 0 if style not found', async () => {
      const { db } = await import('@/lib/db');

      db.select = vi.fn().mockReturnThis();
      db.from = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.limit = vi.fn().mockResolvedValue([]);

      const result = await service.deleteStyleFamily('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('getStyleWithLineage', () => {
    it('should return style with parent and children', async () => {
      const parentStyle = createTestStyle({ id: 'parent', version: 1 });
      const currentStyle = createTestStyle({ id: 'current', version: 2, parentStyleId: 'parent' });
      const childStyle = createTestStyle({ id: 'child', version: 3, parentStyleId: 'current' });

      const { db } = await import('@/lib/db');

      db.query.styles.findFirst = vi.fn().mockResolvedValue({
        ...currentStyle,
        parentStyle,
        childStyles: [childStyle],
      });

      const result = await service.getStyleWithLineage('current');

      expect(result).toBeDefined();
      expect(result.id).toBe('current');
      expect(result.parentStyle).toBeDefined();
      expect(result.parentStyle.id).toBe('parent');
      expect(result.childStyles).toHaveLength(1);
      expect(result.childStyles[0].id).toBe('child');
    });
  });

  describe('createStyle', () => {
    it('should create new style with version 1', async () => {
      const newStyle = createTestStyle({ id: 'new', version: 1, parentStyleId: null });

      const { db } = await import('@/lib/db');

      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([newStyle]);

      const result = await service.createStyle({
        name: 'New Style',
        palette: { primary: ['#FF0000'], secondary: [], accent: [] },
        renderingCues: { materials: ['Metal'], lighting: [], mood: [] },
      });

      expect(result.version).toBe(1);
      expect(result.parentStyleId).toBeNull();
    });
  });

  describe('updateStyle', () => {
    it('should update style fields', async () => {
      const updatedStyle = createTestStyle({ name: 'Updated Name' });

      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([updatedStyle]);

      const result = await service.updateStyle('style-id', {
        name: 'Updated Name',
      });

      expect(result?.name).toBe('Updated Name');
    });
  });
});
