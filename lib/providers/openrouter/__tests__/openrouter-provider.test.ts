import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterProvider, getOpenRouterImageConfig } from '../openrouter-provider';
import { parseOpenRouterDataUrl } from '../openrouter-image-client';
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

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenRouterProvider();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    delete process.env.OPENROUTER_IMAGE_MODEL;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('has the correct name', () => {
    expect(provider.name).toBe('openrouter');
  });

  it('maps resolutions to OpenRouter image_config', () => {
    expect(getOpenRouterImageConfig('3840x2160')).toEqual({
      aspectRatio: '16:9',
      imageSize: '4K',
    });
  });

  it('decodes base64 data URL images and preserves media type', () => {
    const parsed = parseOpenRouterDataUrl(`data:image/webp;base64,${Buffer.from('fake-image').toString('base64')}`);

    expect(parsed.mediaType).toBe('image/webp');
    expect(parsed.buffer).toEqual(Buffer.from('fake-image'));
  });

  it('throws when OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;

    await expect(provider.generateImage({
      prompt: 'test',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    })).rejects.toThrow('OPENROUTER_API_KEY environment variable is not set');
  });

  it('generates and stores an image successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'openai/gpt-5.4-image-2',
        choices: [{
          message: {
            content: 'Generated an image.',
            images: [{
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${Buffer.from('fake-image').toString('base64')}`,
              },
            }],
          },
        }],
        usage: { total_tokens: 100, cost: 0.01 },
      }),
    });

    const result = await provider.generateImage({
      prompt: 'test prompt',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '3840x2160' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-openrouter-key',
          'HTTP-Referer': 'http://localhost:3000',
          'X-OpenRouter-Title': 'Image Gen Web',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({
      model: 'openai/gpt-5.4-image-2',
      messages: [{ role: 'user', content: 'test prompt' }],
      modalities: ['image', 'text'],
      stream: false,
      image_config: {
        aspect_ratio: '16:9',
        image_size: '4K',
      },
    });
    expect(saveImage).toHaveBeenCalledWith(
      { uint8Array: new Uint8Array(Buffer.from('fake-image')), mediaType: 'image/png' },
      'batch-123',
      'gen-123'
    );
    expect(result.images).toHaveLength(1);
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });

  it('throws a clear error when OpenRouter returns no images', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'No image here.' } }],
      }),
    });

    await expect(provider.generateImage({
      prompt: 'test prompt',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
      generationId: 'gen-123',
      parameters: { resolution: '1024x1024' },
    })).rejects.toThrow('no images returned');
  });

  it('marks generation failed when OpenRouter returns an error', async () => {
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
    })).rejects.toThrow('OpenRouter image generation failed: Invalid prompt');

    expect(db.update).toHaveBeenCalledWith(expect.anything());
  });
});
