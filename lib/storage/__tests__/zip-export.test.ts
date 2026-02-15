import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBatchZip, sanitizeBatchName } from '../zip-export';
import type { BatchWithDetails } from '../zip-export';

// Mock the local-storage module
vi.mock('../local-storage', () => ({
  readImage: vi.fn(),
}));

describe('ZIP Export Utilities', () => {
  describe('sanitizeBatchName', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeBatchName('Test Batch')).toBe('test_batch');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeBatchName('My Test Batch Name')).toBe('my_test_batch_name');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeBatchName('Batch #1 - (2024)')).toBe('batch_1_2024');
    });

    it('should remove leading and trailing underscores', () => {
      expect(sanitizeBatchName('  Test Batch  ')).toBe('test_batch');
    });

    it('should handle consecutive special characters', () => {
      expect(sanitizeBatchName('Test!!!Batch')).toBe('test_batch');
    });

    it('should truncate to 50 characters', () => {
      const longName = 'a'.repeat(60);
      expect(sanitizeBatchName(longName)).toHaveLength(50);
    });

    it('should return default name for empty input', () => {
      expect(sanitizeBatchName('   ')).toBe('batch');
      expect(sanitizeBatchName('')).toBe('batch');
    });
  });

  describe('createBatchZip', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create ZIP with metadata file', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        batchPrompts: [{ promptText: 'Test prompt' }],
        generations: [],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      const zipBuffer = await createBatchZip(mockBatch, { includeMetadata: true });

      expect(zipBuffer).toBeInstanceOf(Buffer);
      expect(zipBuffer.length).toBeGreaterThan(0);
    });

    it('should include original images', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test.png',
                filePath: '/path/to/test.png',
                transparentFilePath: null,
                flippedFilePath: null,
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      const zipBuffer = await createBatchZip(mockBatch);

      expect(readImage).toHaveBeenCalledWith('/path/to/test.png');
      expect(zipBuffer).toBeInstanceOf(Buffer);
    });

    it('should include transparent versions when requested', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test.png',
                filePath: '/path/to/test.png',
                transparentFilePath: '/path/to/transparent.png',
                flippedFilePath: null,
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      await createBatchZip(mockBatch, { includeTransparent: true });

      expect(readImage).toHaveBeenCalledWith('/path/to/test.png');
      expect(readImage).toHaveBeenCalledWith('/path/to/transparent.png');
    });

    it('should not include transparent versions when disabled', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test.png',
                filePath: '/path/to/test.png',
                transparentFilePath: '/path/to/transparent.png',
                flippedFilePath: null,
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      await createBatchZip(mockBatch, { includeTransparent: false });

      expect(readImage).toHaveBeenCalledWith('/path/to/test.png');
      expect(readImage).not.toHaveBeenCalledWith('/path/to/transparent.png');
    });

    it('should include flipped versions when requested', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test.png',
                filePath: '/path/to/test.png',
                transparentFilePath: null,
                flippedFilePath: '/path/to/flipped.png',
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      await createBatchZip(mockBatch, { includeFlipped: true });

      expect(readImage).toHaveBeenCalledWith('/path/to/test.png');
      expect(readImage).toHaveBeenCalledWith('/path/to/flipped.png');
    });

    it('should handle multiple images with sequential naming', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test1.png',
                filePath: '/path/to/test1.png',
                transparentFilePath: null,
                flippedFilePath: null,
              },
              {
                id: 'img-2',
                fileName: 'test2.png',
                filePath: '/path/to/test2.png',
                transparentFilePath: null,
                flippedFilePath: null,
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      const zipBuffer = await createBatchZip(mockBatch);

      expect(readImage).toHaveBeenCalledTimes(2);
      expect(zipBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle read errors gracefully', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            status: 'success',
            images: [
              {
                id: 'img-1',
                fileName: 'test.png',
                filePath: '/path/to/test.png',
                transparentFilePath: null,
                flippedFilePath: null,
              },
            ],
          },
        ],
      };

      vi.mocked(readImage).mockRejectedValueOnce(new Error('File not found'));

      // Silence console.error for this test as it's an expected failure
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw, should continue processing
      const zipBuffer = await createBatchZip(mockBatch);
      expect(zipBuffer).toBeInstanceOf(Buffer);

      consoleSpy.mockRestore();
    });

    it('should skip metadata file when disabled', async () => {
      const { readImage } = await import('../local-storage');

      const mockBatch: BatchWithDetails = {
        id: 'batch-1',
        name: 'Test Batch',
        status: 'completed',
        generations: [],
      };

      vi.mocked(readImage).mockResolvedValue(Buffer.from('mock-image-data'));

      const zipBuffer = await createBatchZip(mockBatch, { includeMetadata: false });

      expect(zipBuffer).toBeInstanceOf(Buffer);
    });
  });
});
