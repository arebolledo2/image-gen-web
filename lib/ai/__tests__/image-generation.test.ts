import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImage, executeBatch } from '../image-generation';

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

// Mock Google AI SDK
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model) => ({ model })),
}));

// Mock database
vi.mock('@/lib/db', () => {
  const mockDbInsert = vi.fn();
  const mockDbUpdate = vi.fn();
  const mockDbQueryBatches = vi.fn();

  return {
    db: {
      insert: mockDbInsert,
      update: mockDbUpdate,
      query: {
        batches: {
          findFirst: mockDbQueryBatches,
        },
      },
    },
  };
});

// Mock storage
vi.mock('@/lib/storage/local-storage', () => ({
  saveImage: vi.fn(),
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  generations: 'generations',
  images: 'images',
  batches: 'batches',
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, op: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, op: 'and' })),
}));

import { generateText } from 'ai';
import { saveImage } from '@/lib/storage/local-storage';
import { db } from '@/lib/db';

describe('generateImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate image successfully', async () => {
    const mockGenerationId = 'gen-123';
    const mockImageFile = {
      uint8Array: new Uint8Array([1, 2, 3]),
      mediaType: 'image/png',
    };

    // Mock database insert for generation
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: mockGenerationId, status: 'running' },
        ]),
      }),
    } as any);

    // Mock database update
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    // Mock AI generation
    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated image',
      files: [mockImageFile],
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50 },
    } as any);

    // Mock storage
    vi.mocked(saveImage).mockResolvedValue('outputs/batches/batch-123/gen-123_12345.png');

    const result = await generateImage({
      prompt: 'A robot turret',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
    });

    expect(result.generation).toBeDefined();
    expect(result.images).toHaveLength(1);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ model: 'gemini-2.5-flash-image-preview' }),
        prompt: 'A robot turret',
      })
    );
  });

  it('should handle generation failure', async () => {
    const mockGenerationId = 'gen-fail';

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: mockGenerationId, status: 'running' },
        ]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    const mockError = new Error('AI generation failed');
    vi.mocked(generateText).mockRejectedValue(mockError);

    await expect(
      generateImage({
        prompt: 'test',
        batchId: 'batch-123',
        batchPromptId: 'bp-123',
        runNumber: 1,
      })
    ).rejects.toThrow('AI generation failed');

    // Verify error was recorded in database
    expect(db.update).toHaveBeenCalled();
  });

  it('should handle missing images in response', async () => {
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    // No files in response
    vi.mocked(generateText).mockResolvedValue({
      text: 'No images',
      files: [],
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await expect(
      generateImage({
        prompt: 'test',
        batchId: 'batch-123',
        batchPromptId: 'bp-123',
        runNumber: 1,
      })
    ).rejects.toThrow('No images generated');
  });

  it('should save multiple images from response', async () => {
    const mockImageFiles = [
      { uint8Array: new Uint8Array([1]), mediaType: 'image/png' },
      { uint8Array: new Uint8Array([2]), mediaType: 'image/png' },
    ];

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated',
      files: mockImageFiles,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    vi.mocked(saveImage).mockResolvedValue('path/to/image.png');

    const result = await generateImage({
      prompt: 'test',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
    });

    expect(result.images).toHaveLength(2);
    expect(saveImage).toHaveBeenCalledTimes(2);
  });

  it('should filter non-image files from response', async () => {
    const mockFiles = [
      { uint8Array: new Uint8Array([1]), mediaType: 'image/png' },
      { uint8Array: new Uint8Array([2]), mediaType: 'text/plain' },
      { uint8Array: new Uint8Array([3]), mediaType: 'image/jpeg' },
    ];

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated',
      files: mockFiles,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    vi.mocked(saveImage).mockResolvedValue('path/to/image.png');

    const result = await generateImage({
      prompt: 'test',
      batchId: 'batch-123',
      batchPromptId: 'bp-123',
      runNumber: 1,
    });

    // Should only save the 2 image files
    expect(result.images).toHaveLength(2);
    expect(saveImage).toHaveBeenCalledTimes(2);
  });
});

describe('executeBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute batch with multiple prompts', async () => {
    const mockBatch = {
      id: 'batch-123',
      name: 'Test Batch',
      status: 'draft',
      defaults: { count: 2 },
      batchPrompts: [
        {
          id: 'bp-1',
          promptText: 'Prompt 1',
          overrides: null,
          order: 1,
        },
        {
          id: 'bp-2',
          promptText: 'Prompt 2',
          overrides: { count: 1 },
          order: 2,
        },
      ],
    };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatch as any);

    // Mock generateImage by mocking its dependencies
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated',
      files: [{ uint8Array: new Uint8Array([1]), mediaType: 'image/png' }],
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    vi.mocked(saveImage).mockResolvedValue('path/to/image.png');

    const result = await executeBatch('batch-123');

    expect(result.success).toBe(true);
    // Should call generateText 3 times: 2 for first prompt, 1 for second
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it('should handle batch not found', async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(db.query.batches.findFirst).mockResolvedValue(undefined);

    await expect(executeBatch('nonexistent')).rejects.toThrow('Batch not found');
  });

  it('should update batch status to failed on error', async () => {
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(db.query.batches.findFirst).mockRejectedValue(
      new Error('Database error')
    );

    await expect(executeBatch('batch-123')).rejects.toThrow('Database error');

    // Verify failure status was set
    expect(db.update).toHaveBeenCalledWith('batches');
  });

  it('should use default count when no overrides', async () => {
    const mockBatch = {
      id: 'batch-123',
      defaults: { count: 3 },
      batchPrompts: [
        {
          id: 'bp-1',
          promptText: 'Test prompt',
          overrides: null,
          order: 1,
        },
      ],
    };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatch as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated',
      files: [{ uint8Array: new Uint8Array([1]), mediaType: 'image/png' }],
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    vi.mocked(saveImage).mockResolvedValue('path/to/image.png');

    await executeBatch('batch-123');

    // Should generate 3 times based on defaults.count
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it('should use count of 1 when no defaults or overrides', async () => {
    const mockBatch = {
      id: 'batch-123',
      defaults: null,
      batchPrompts: [
        {
          id: 'bp-1',
          promptText: 'Test prompt',
          overrides: null,
          order: 1,
        },
      ],
    };

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any);

    vi.mocked(db.query.batches.findFirst).mockResolvedValue(mockBatch as any);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'gen-123' }]),
      }),
    } as any);

    vi.mocked(generateText).mockResolvedValue({
      text: 'Generated',
      files: [{ uint8Array: new Uint8Array([1]), mediaType: 'image/png' }],
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    vi.mocked(saveImage).mockResolvedValue('path/to/image.png');

    await executeBatch('batch-123');

    // Should generate once with default count of 1
    expect(generateText).toHaveBeenCalledTimes(1);
  });
});
