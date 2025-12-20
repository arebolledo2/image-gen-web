import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStyleAgent,
  createPromptAgent,
  suggestPromptVariations,
} from '../agents';

// Mock the AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn((config) => config),
  },
}));

// Mock Google AI SDK
vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model) => ({ model })),
}));

import { generateText } from 'ai';

describe('createStyleAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a style with valid hex colors', async () => {
    const mockStyle = {
      name: 'Neon Synth',
      description: 'Futuristic neon aesthetic',
      palette: {
        primary: ['#00FFFF', '#FF00FF'],
        accent: ['#0000FF', '#FF1493'],
        background: '#0A0A1F',
      },
      renderingCues: {
        materials: ['glossy metal', 'chrome'],
        effects: ['emissive seams', 'soft bloom'],
        finish: 'glossy',
      },
    };

    vi.mocked(generateText).mockResolvedValue({
      experimental_output: mockStyle,
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 200 },
    } as any);

    const result = await createStyleAgent('futuristic neon style');

    expect(result).toEqual(mockStyle);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ model: 'gemini-2.0-flash-exp' }),
        prompt: 'Create a style based on: futuristic neon style',
      })
    );
  });

  it('should pass system prompt with hex color requirements', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: {
        name: 'Test',
        description: 'Test style',
        palette: { primary: ['#FF0000'], accent: ['#00FF00'], background: '#0000FF' },
        renderingCues: { materials: [], effects: [], finish: 'matte' },
      },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createStyleAgent('test');

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('hex color codes'),
      })
    );
  });

  it('should use gemini-2.0-flash-exp model', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: {
        name: 'Test',
        description: 'Test',
        palette: { primary: ['#FFFFFF'], accent: ['#000000'], background: '#AAAAAA' },
        renderingCues: { materials: [], effects: [], finish: 'matte' },
      },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createStyleAgent('test');

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ model: 'gemini-2.0-flash-exp' }),
      })
    );
  });
});

describe('createPromptAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create prompt with all parameters', async () => {
    const mockPrompt = {
      name: 'Turret Sprite',
      template: '4x4 sprite sheet of robot turret, neon synth style, top-down view, magenta background',
      tags: ['sprite', 'turret', 'neon'],
    };

    vi.mocked(generateText).mockResolvedValue({
      experimental_output: mockPrompt,
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    const result = await createPromptAgent({
      assetType: 'turret',
      styleName: 'Neon Synth',
      styleKeywords: ['chrome', 'glowing'],
      description: 'rotating turret',
    });

    expect(result).toEqual(mockPrompt);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Asset Type: turret'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Style: Neon Synth'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Style Keywords: chrome, glowing'),
      })
    );
  });

  it('should work with minimal parameters', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', template: 'test', tags: [] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    const result = await createPromptAgent({
      assetType: 'enemy',
    });

    expect(result).toBeDefined();
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Asset Type: enemy'),
      })
    );
  });

  it('should include magenta background in system prompt', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', template: 'test', tags: [] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createPromptAgent({ assetType: 'test' });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('magenta background'),
      })
    );
  });

  it('should request sprite sheet specifications in system prompt', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', template: 'test', tags: [] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createPromptAgent({ assetType: 'test' });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('4x4 sprite sheet'),
      })
    );
  });
});

describe('suggestPromptVariations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return specified number of variations', async () => {
    const mockVariations = [
      'Variation 1 with magenta background',
      'Variation 2 with magenta background',
      'Variation 3 with magenta background',
    ];

    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: mockVariations },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    const result = await suggestPromptVariations('base prompt', 3);

    expect(result).toEqual(mockVariations);
    expect(result).toHaveLength(3);
  });

  it('should use default count of 3', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: ['v1', 'v2', 'v3'] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await suggestPromptVariations('base prompt');

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('3 variations'),
      })
    );
  });

  it('should maintain magenta background requirement', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: ['var1', 'var2'] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await suggestPromptVariations('test prompt', 2);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('magenta background'),
      })
    );
  });

  it('should pass base prompt to generation', async () => {
    const basePrompt = 'red robot turret, top-down, magenta background';
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: ['v1'] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await suggestPromptVariations(basePrompt, 1);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining(basePrompt),
      })
    );
  });
});
