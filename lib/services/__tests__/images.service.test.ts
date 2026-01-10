/**
 * Tests for ImagesService
 * Priority: Cascade deletes, filtering logic, statistics calculations
 * NOTE: Contains tests for identified performance issue (in-memory filtering)
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagesService } from '../images.service';
import { createMockTransaction, createTestImage, createTestGeneration } from './test-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    query: {
      images: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      generations: {
        findMany: vi.fn(),
      },
      squishAnimations: {
        findMany: vi.fn(),
      },
      imageEdits: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  images: {
    id: 'id',
    generationId: 'generationId',
    isFavorite: 'isFavorite',
    createdAt: 'createdAt',
  },
  generations: { id: 'id', batchId: 'batchId' },
  squishAnimations: { id: 'id', imageId: 'imageId' },
  imageEdits: { id: 'id', imageId: 'imageId' },
}));

describe('ImagesService', () => {
  let service: ImagesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImagesService();
  });

  describe('getImagesByBatch - PERFORMANCE ISSUE IDENTIFIED', () => {
    it('should fetch images for a batch', async () => {
      const mockGenerations = [
        createTestGeneration({ id: 'gen-1', batchId: 'batch-1' }),
        createTestGeneration({ id: 'gen-2', batchId: 'batch-1' }),
      ];

      const mockImages = [
        createTestImage({ id: 'img-1', generationId: 'gen-1', isFavorite: false }),
        createTestImage({ id: 'img-2', generationId: 'gen-2', isFavorite: true }),
      ];

      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue(mockGenerations);
      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      const result = await service.getImagesByBatch('batch-1');

      expect(result).toHaveLength(2);
    });

    it('PERFORMANCE BUG: applies favoritesOnly filter in memory instead of SQL', async () => {
      const mockGenerations = [createTestGeneration({ id: 'gen-1' })];

      const mockImages = [
        createTestImage({ id: 'img-1', isFavorite: true }),
        createTestImage({ id: 'img-2', isFavorite: false }),
        createTestImage({ id: 'img-3', isFavorite: false }),
      ];

      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue(mockGenerations);
      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      const result = await service.getImagesByBatch('batch-1', {
        favoritesOnly: true,
      });

      // Current implementation: Fetches ALL 3 images, then filters in memory
      // This is inefficient - should use SQL WHERE clause instead
      expect(db.query.images.findMany).toHaveBeenCalled();

      // Result should be filtered
      expect(result).toHaveLength(1);
      expect(result[0].isFavorite).toBe(true);

      // TODO: After optimization, verify WHERE clause is used in query
    });

    it('PERFORMANCE BUG: applies limit in memory instead of SQL', async () => {
      const mockGenerations = [createTestGeneration({ id: 'gen-1' })];

      const mockImages = [
        createTestImage({ id: 'img-1' }),
        createTestImage({ id: 'img-2' }),
        createTestImage({ id: 'img-3' }),
        createTestImage({ id: 'img-4' }),
        createTestImage({ id: 'img-5' }),
      ];

      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue(mockGenerations);
      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      const result = await service.getImagesByBatch('batch-1', {
        limit: 2,
      });

      // Current implementation: Fetches ALL 5 images, then slices in memory
      // Should use SQL LIMIT instead
      expect(result).toHaveLength(2);

      // TODO: After optimization, verify LIMIT is passed to query
    });

    it('should handle empty batch (no generations)', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getImagesByBatch('empty-batch');

      expect(result).toEqual([]);
    });

    it('should handle batch with generations but no images', async () => {
      const mockGenerations = [createTestGeneration({ id: 'gen-1' })];

      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue(mockGenerations);
      db.query.images.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getImagesByBatch('batch-1');

      expect(result).toEqual([]);
    });
  });

  describe('getFavoriteImages', () => {
    it('should return only favorite images', async () => {
      const mockImages = [
        createTestImage({ id: 'img-1', isFavorite: true }),
        createTestImage({ id: 'img-2', isFavorite: true }),
      ];

      const { db } = await import('@/lib/db');

      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      const result = await service.getFavoriteImages();

      expect(result).toHaveLength(2);
      result.forEach(img => {
        expect(img.isFavorite).toBe(true);
      });
    });

    it('should respect limit parameter', async () => {
      const mockImages = [
        createTestImage({ id: 'img-1', isFavorite: true }),
      ];

      const { db } = await import('@/lib/db');

      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      await service.getFavoriteImages(5);

      // Verify limit was passed to query
      expect(db.query.images.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('createImage', () => {
    it('should create new image record', async () => {
      const mockImage = createTestImage();

      const { db } = await import('@/lib/db');

      db.insert = vi.fn().mockReturnThis();
      db.values = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([mockImage]);

      const result = await service.createImage({
        generationId: 'gen-1',
        fileName: 'test.png',
        filePath: '/test/test.png',
        mimeType: 'image/png',
        fileSize: 1024,
        width: 512,
        height: 512,
      });

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status from false to true', async () => {
      const mockImage = createTestImage({ isFavorite: false });

      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([{ ...mockImage, isFavorite: true }]);

      const result = await service.toggleFavorite('image-id');

      expect(result?.isFavorite).toBe(true);
    });
  });

  describe('deleteImageWithTransformations - CASCADE DELETE', () => {
    it('should delete image and all transformations in transaction', async () => {
      createTestImage({ id: 'image-id' });
      const mockTx = createMockTransaction();

      // Mock finding transformations
      mockTx.query.squishAnimations.findMany = vi.fn().mockResolvedValue([
        { id: 'anim-1', imageId: 'image-id' },
      ]);
      mockTx.query.imageEdits.findMany = vi.fn().mockResolvedValue([
        { id: 'edit-1', imageId: 'image-id' },
      ]);

      // Mock deletes
      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.deleteImageWithTransformations('image-id');

      // Verify transaction was used
      expect(db.transaction).toHaveBeenCalled();

      // Verify all related data was deleted
      expect(mockTx.delete).toHaveBeenCalled();
      // Should delete: animations, edits, and the image itself
      expect(mockTx.delete).toHaveBeenCalledTimes(3);
    });

    it('should handle image with no transformations', async () => {
      const mockTx = createMockTransaction();

      mockTx.query.squishAnimations.findMany = vi.fn().mockResolvedValue([]);
      mockTx.query.imageEdits.findMany = vi.fn().mockResolvedValue([]);

      mockTx.delete = vi.fn().mockReturnThis();
      mockTx.where = vi.fn().mockReturnThis();

      const { db } = await import('@/lib/db');
      db.transaction = vi.fn((callback) => callback(mockTx));

      await service.deleteImageWithTransformations('image-id');

      // Still calls delete 3 times (animations, edits, image), even though animations and edits are empty
      // The where clause will just find nothing to delete
      expect(mockTx.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('getImageStatistics', () => {
    it('should calculate correct statistics', async () => {
      const mockImages = [
        createTestImage({
          id: 'img-1',
          isFavorite: true,
          squishAnimations: [{ id: 'anim-1', imageId: 'img-1' }],
          imageEdits: [{ id: 'edit-1', imageId: 'img-1' }],
        }),
        createTestImage({ id: 'img-2', isFavorite: false }),
        createTestImage({ id: 'img-3', isFavorite: true, transparentFilePath: '/path/transparent.png' }),
        createTestImage({ id: 'img-4', isFavorite: false, flippedFilePath: '/path/flipped.png' }),
      ];

      const mockGenerations = [
        createTestGeneration({ id: 'gen-1', batchId: 'batch-1' }),
      ];

      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue(mockGenerations);
      db.query.images.findMany = vi.fn().mockResolvedValue(mockImages);

      const result = await service.getImageStatistics('batch-1');

      expect(result.total).toBe(4);
      expect(result.favorites).toBe(2);
      expect(result.withTransparent).toBe(1); // img-3 has transparentFilePath
      expect(result.withFlipped).toBe(1); // img-4 has flippedFilePath
      expect(result.withAnimations).toBe(1); // img-1 has animation
      expect(result.withEdits).toBe(1); // img-1 has edit
    });

    it('should handle batch with no images', async () => {
      const { db } = await import('@/lib/db');

      db.query.generations.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getImageStatistics('empty-batch');

      expect(result.total).toBe(0);
      expect(result.favorites).toBe(0);
      expect(result.withTransparent).toBe(0);
      expect(result.withFlipped).toBe(0);
      expect(result.withAnimations).toBe(0);
      expect(result.withEdits).toBe(0);
    });
  });

  describe('updateImagePaths', () => {
    it('should update image file paths', async () => {
      const updatedImage = createTestImage({ transparentFilePath: '/new/path.png' });

      const { db } = await import('@/lib/db');

      db.update = vi.fn().mockReturnThis();
      db.set = vi.fn().mockReturnThis();
      db.where = vi.fn().mockReturnThis();
      db.returning = vi.fn().mockResolvedValue([updatedImage]);

      const result = await service.updateImagePaths('image-id', {
        transparentFilePath: '/new/path.png',
      });

      expect(result?.transparentFilePath).toBe('/new/path.png');
    });
  });
});
