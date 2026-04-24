import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider, getOpenAIImageSize } from '../openai-provider';
import { db } from '@/lib/db';
import { saveImage } from '@/lib/storage/local-storage';

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({}),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{
          id: 'img-123',
          filePath: 'path/to/image.png',
          fileName: 'image.png',
          mediaType: 'image/png',
          fileSize: 12,
        }]),
      })),
    })),
  },
}));

vi.mock('@/lib/storage/local-storage', () => ({
  saveImage: vi.fn().mockResolvedValue('path/to/image.png'),
}));

vi.mock('@/lib/db/schema', () => ({
  generations: 'generations',
  images: 'images',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider();
    process.env.OPENAI_API_KEY = 'test-api-key';
    delete process.env.OPENAI_IMAGE_MODEL;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('has the correct name', () => {
    expect(provider.name).toBe('openai');
  });

  it('maps unsupported resolutions to the default official OpenAI size', () => {
    expect(getOpenAIImageSize('512x512')).toBe('1024x1024');
  });

  it('maps official OpenAI resolutions directly', () => {
    expect(getOpenAIImageSize('1024x1536')).toBe('1024x1536');
    expect(getOpenAIImageSize('1536x1024')).toBe('1536x1024');
  });

  it('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(provider.generateImage({
      prompt: 'test',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    })).rejects.toThrow('OPENAI_API_KEY environment variable is not set');
  });

  it('generates and stores an image successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          b64_json: Buffer.from('fake-image').toString('base64'),
          revised_prompt: 'revised prompt',
        }],
        usage: { total_tokens: 100 },
      }),
    });

    const result = await provider.generateImage({
      prompt: 'test prompt',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"model":"gpt-image-2"'),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"size":"1024x1024"'),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"output_format":"png"'),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"n":1'),
      })
    );
    expect(saveImage).toHaveBeenCalledWith(
      { uint8Array: new Uint8Array(Buffer.from('fake-image')), mediaType: 'image/png' },
      'batch-123',
      'gen-123'
    );
    expect(result.images).toHaveLength(1);
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it('marks generation failed when OpenAI returns an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: { message: 'Invalid prompt' } }),
    });

    await expect(provider.generateImage({
      prompt: 'test',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    })).rejects.toThrow('OpenAI image generation failed: Invalid prompt');

    expect(db.update).toHaveBeenCalledWith(expect.anything());
  });
});
