import { describe, it, expect, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET as getBatches } from '../batches/route';
import { GET as getBatchImages } from '../batches/[id]/images/route';
import { GET as downloadBatch } from '../batches/[id]/download/route';

// Mock the services
vi.mock('@/lib/services', () => ({
  batchesService: {
    getBatches: vi.fn(),
    getBatchWithDetails: vi.fn(),
    findById: vi.fn(),
  },
  imagesService: {
    getImagesByBatch: vi.fn(),
  },
}));

// Mock the zip export utility
vi.mock('@/lib/storage/zip-export', () => ({
  createBatchZip: vi.fn(),
  sanitizeBatchName: vi.fn((name: string) => name.toLowerCase().replace(/\s+/g, '_')),
}));

// Helper to create mock NextRequest with proper URL
function createMockRequest(urlString: string): NextRequest {
  return {
    nextUrl: new URL(urlString),
    url: urlString,
  } as NextRequest;
}

describe('Export API Routes', () => {
  describe('GET /api/export/batches', () => {
    it('should return batches with default parameters', async () => {
      const { batchesService } = await import('@/lib/services');

      const mockBatches = [
        {
          id: 'batch-1',
          name: 'Test Batch 1',
          status: 'completed',
          batchPrompts: [],
        },
      ];

      vi.mocked(batchesService.getBatches).mockResolvedValueOnce(mockBatches as any);

      const request = createMockRequest('http://localhost:3000/api/export/batches');
      const response = await getBatches(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batches).toEqual(mockBatches);
      expect(data.count).toBe(1);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    it('should handle search query parameter', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatches).mockResolvedValueOnce([]);

      const request = createMockRequest('http://localhost:3000/api/export/batches?search=spider');
      await getBatches(request);

      expect(batchesService.getBatches).toHaveBeenCalledWith({
        search: 'spider',
        status: undefined,
        includeImageCount: false,
        limit: 20,
        offset: 0,
      });
    });

    it('should handle status filter', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatches).mockResolvedValueOnce([]);

      const request = createMockRequest('http://localhost:3000/api/export/batches?status=completed');
      await getBatches(request);

      expect(batchesService.getBatches).toHaveBeenCalledWith({
        search: undefined,
        status: 'completed',
        includeImageCount: false,
        limit: 20,
        offset: 0,
      });
    });

    it('should handle includeImageCount parameter', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatches).mockResolvedValueOnce([]);

      const request = createMockRequest('http://localhost:3000/api/export/batches?includeImageCount=true');
      await getBatches(request);

      expect(batchesService.getBatches).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        includeImageCount: true,
        limit: 20,
        offset: 0,
      });
    });

    it('should handle pagination parameters', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatches).mockResolvedValueOnce([]);

      const request = createMockRequest('http://localhost:3000/api/export/batches?limit=10&offset=5');
      await getBatches(request);

      expect(batchesService.getBatches).toHaveBeenCalledWith({
        search: undefined,
        status: undefined,
        includeImageCount: false,
        limit: 10,
        offset: 5,
      });
    });

    it('should handle errors gracefully', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatches).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest('http://localhost:3000/api/export/batches');
      const response = await getBatches(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('GET /api/export/batches/[id]/images', () => {
    const mockBatchId = 'test-batch-123';

    it('should return images for a valid batch', async () => {
      const { batchesService, imagesService } = await import('@/lib/services');

      const mockBatch = { id: mockBatchId, name: 'Test Batch', status: 'completed' };
      const mockImages = [
        {
          id: 'img-1',
          fileName: 'test.png',
          fileSize: 1024,
          metadata: {},
          isFavorite: false,
          createdAt: new Date(),
          transparentFilePath: null,
          flippedFilePath: null,
          generation: {
            status: 'success',
            batchPrompt: { promptText: 'Test prompt' },
          },
        },
      ];

      vi.mocked(batchesService.findById).mockResolvedValueOnce(mockBatch as any);
      vi.mocked(imagesService.getImagesByBatch).mockResolvedValueOnce(mockImages as any);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/images`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await getBatchImages(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.batchId).toBe(mockBatchId);
      expect(data.batchName).toBe('Test Batch');
      expect(data.images).toHaveLength(1);
      expect(data.images[0].downloadUrl).toBe('/api/images/img-1/file?version=original');
      expect(data.images[0].thumbnailUrl).toBe('/api/images/img-1/file?size=thumbnail');
    });

    it('should return 404 for non-existent batch', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.findById).mockResolvedValueOnce(undefined);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/images`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await getBatchImages(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Batch not found');
    });

    it('should include transparent and flipped URLs when available', async () => {
      const { batchesService, imagesService } = await import('@/lib/services');

      const mockBatch = { id: mockBatchId, name: 'Test Batch', status: 'completed' };
      const mockImages = [
        {
          id: 'img-1',
          fileName: 'test.png',
          fileSize: 1024,
          metadata: {},
          isFavorite: false,
          createdAt: new Date(),
          transparentFilePath: '/path/to/transparent.png',
          flippedFilePath: '/path/to/flipped.png',
          generation: {
            status: 'success',
            batchPrompt: { promptText: 'Test prompt' },
          },
        },
      ];

      vi.mocked(batchesService.findById).mockResolvedValueOnce(mockBatch as any);
      vi.mocked(imagesService.getImagesByBatch).mockResolvedValueOnce(mockImages as any);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/images`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await getBatchImages(request, { params });

      const data = await response.json();
      expect(data.images[0].transparentUrl).toBe('/api/images/img-1/file?version=transparent');
      expect(data.images[0].flippedUrl).toBe('/api/images/img-1/file?version=flipped');
    });

    it('should handle errors gracefully', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.findById).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/images`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await getBatchImages(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });

  describe('GET /api/export/batches/[id]/download', () => {
    const mockBatchId = 'test-batch-123';

    it('should return ZIP file for valid batch', async () => {
      const { batchesService } = await import('@/lib/services');
      const { createBatchZip } = await import('@/lib/storage/zip-export');

      const mockBatch = {
        id: mockBatchId,
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            images: [{ id: 'img-1', fileName: 'test.png', filePath: '/path/to/test.png' }],
          },
        ],
      };

      const mockZipBuffer = Buffer.from('mock-zip-content');

      vi.mocked(batchesService.getBatchWithDetails).mockResolvedValueOnce(mockBatch as any);
      vi.mocked(createBatchZip).mockResolvedValueOnce(mockZipBuffer);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/download`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await downloadBatch(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('.zip');
    });

    it('should return 404 for non-existent batch', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatchWithDetails).mockResolvedValueOnce(null as any);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/download`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await downloadBatch(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Batch not found');
    });

    it('should return 400 for batch with no images', async () => {
      const { batchesService } = await import('@/lib/services');

      const mockBatch = {
        id: mockBatchId,
        name: 'Empty Batch',
        status: 'completed',
        generations: [],
      };

      vi.mocked(batchesService.getBatchWithDetails).mockResolvedValueOnce(mockBatch as any);

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/download`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await downloadBatch(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Batch has no images to export');
    });

    it('should respect query parameters', async () => {
      const { batchesService } = await import('@/lib/services');
      const { createBatchZip } = await import('@/lib/storage/zip-export');

      const mockBatch = {
        id: mockBatchId,
        name: 'Test Batch',
        status: 'completed',
        generations: [
          {
            images: [{ id: 'img-1', fileName: 'test.png', filePath: '/path/to/test.png' }],
          },
        ],
      };

      vi.mocked(batchesService.getBatchWithDetails).mockResolvedValueOnce(mockBatch as any);
      vi.mocked(createBatchZip).mockResolvedValueOnce(Buffer.from('mock'));

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/download?includeTransparent=false&includeFlipped=true`);
      const params = Promise.resolve({ id: mockBatchId });
      await downloadBatch(request, { params });

      expect(createBatchZip).toHaveBeenCalledWith(mockBatch, {
        includeTransparent: false,
        includeFlipped: true,
        includeMetadata: true,
      });
    });

    it('should handle errors gracefully', async () => {
      const { batchesService } = await import('@/lib/services');

      vi.mocked(batchesService.getBatchWithDetails).mockRejectedValueOnce(new Error('Database error'));

      const request = createMockRequest(`http://localhost:3000/api/export/batches/${mockBatchId}/download`);
      const params = Promise.resolve({ id: mockBatchId });
      const response = await downloadBatch(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });
  });
});
