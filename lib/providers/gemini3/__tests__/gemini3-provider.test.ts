import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Gemini3Provider } from '../gemini3-provider';
import { db } from '@/lib/db';
import { saveImage } from '@/lib/storage/local-storage';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'img-123' }]),
      })),
    })),
  },
}));

vi.mock('@/lib/storage/local-storage', () => ({
  saveImage: vi.fn().mockResolvedValue('path/to/image.png'),
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  generations: 'generations',
  images: 'images',
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Gemini3Provider', () => {
  let provider: Gemini3Provider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new Gemini3Provider();
    process.env.GEMINI_API_KEY = 'test-api-key';
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('should have the correct name', () => {
    expect(provider.name).toBe('gemini3');
  });

  it('should test connection successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const result = await provider.testConnection();
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('gemini-3-pro-image-preview')
    );
  });

  it('should generate images successfully', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'Thought process...' },
              {
                inlineData: {
                  data: 'base64data',
                  mimeType: 'image/png',
                },
                thoughtSignature: 'sig-123',
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const options = {
      prompt: 'test prompt',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    };

    const result = await provider.generateImage(options);

    expect(result.generationId).toBe('gen-123');
    expect(result.images).toHaveLength(1);
    expect(saveImage).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();

    // Check if correct resolution was mapped
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"imageSize":"1K"')
      })
    );
  });

  it('should map 2K resolution correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'd' } }] } }]
      }),
    });

    await provider.generateImage({
      prompt: 'test',
      batchId: 'b',
      batchPromptId: 'bp',
      runNumber: 1,
      generationId: 'g',
      parameters: { resolution: '2048x2048' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"imageSize":"2K"')
      })
    );
  });

  it('should map 4K resolution correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { data: 'd' } }] } }]
      }),
    });

    await provider.generateImage({
      prompt: 'test',
      batchId: 'b',
      batchPromptId: 'bp',
      runNumber: 1,
      generationId: 'g',
      parameters: { resolution: '4096x4096' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"imageSize":"4K"')
      })
    );
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'Invalid prompt' } }),
    });

    await expect(provider.generateImage({
      prompt: 'test',
      batchId: 'b',
      batchPromptId: 'bp',
      runNumber: 1,
      generationId: 'g',
    })).rejects.toThrow('Gemini 3 API request failed: Invalid prompt');

    expect(db.update).toHaveBeenCalledWith(expect.anything());
  });

  it('should handle safety blocks', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }]
      }),
    });

    await expect(provider.generateImage({
      prompt: 'test',
      batchId: 'b',
      batchPromptId: 'bp',
      runNumber: 1,
      generationId: 'g',
    })).rejects.toThrow('Image generation blocked by safety filters');
  });
});
