import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStyleAgent,
  createPromptAgent,
  suggestPromptVariations,
  composeConstructedPromptAgent,
  createBatchMetadataAgent,
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
      artisticDirection: {
        visualStyle: 'Cyberpunk 3D',
        lighting: 'Cinematic',
        cameraPerspective: 'Top-down',
        levelOfDetail: 'High',
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
        artisticDirection: { visualStyle: '', lighting: '', cameraPerspective: '', levelOfDetail: '' },
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
        artisticDirection: { visualStyle: '', lighting: '', cameraPerspective: '', levelOfDetail: '' },
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

  it('should include magenta background in system prompt when isTransparent is true', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', template: 'test', tags: [] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createPromptAgent({ assetType: 'test', isTransparent: true });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('solid bright magenta background #FF00FF single tone with no gradients'),
      })
    );
  });

  it('should NOT include magenta background in system prompt when isTransparent is false', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', template: 'test', tags: [] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createPromptAgent({ assetType: 'test', isTransparent: false });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('DO NOT use a magenta background'),
      })
    );
    expect(generateText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('ALWAYS include "solid bright magenta background #FF00FF single tone with no gradients"'),
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

  it('should maintain magenta background requirement when isTransparent is true', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: ['var1', 'var2'] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await suggestPromptVariations('test prompt', 2, true);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Keep "solid bright magenta background #FF00FF single tone with no gradients" for transparency'),
      })
    );
  });

  it('should NOT maintain magenta background requirement when isTransparent is false', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { variations: ['var1', 'var2'] },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await suggestPromptVariations('test prompt', 2, false);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('DO NOT use a magenta background'),
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

describe('composeConstructedPromptAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compose a prompt from all components', async () => {
    const mockComposedPrompt = 'Robot Turret, metal armor, cyan and blue colors, futuristic style, top-down view, magenta background';
    
    vi.mocked(generateText).mockResolvedValue({
      text: mockComposedPrompt,
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    const params = {
      subject: { name: 'Robot Turret', description: 'Heavy defense' },
      style: {
        name: 'Futuristic',
        description: 'Sleek and modern',
        palette: {
          primary: ['#00FFFF', '#0000FF'],
          accent: ['#FFFFFF'],
        },
        renderingCues: {
          materials: ['metal armor'],
          effects: ['glow'],
        },
      },
      guidance: [
        { name: 'View', description: 'top-down' },
        { name: 'Transparency', description: 'magenta background' },
      ],
    };

    const result = await composeConstructedPromptAgent(params);

    expect(result).toBe(mockComposedPrompt);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Subject: Robot Turret (Heavy defense)'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Style: Futuristic'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Palette: #00FFFF, #0000FF, #FFFFFF'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Materials: metal armor'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Effects: glow'),
      })
    );
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('- View: top-down'),
      })
    );
  });

  it('should include magenta background requirement in system prompt when isTransparent is true', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'test prompt',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await composeConstructedPromptAgent({
      subject: { name: 'test', isTransparent: true },
      style: {
        name: 'test',
        palette: { primary: [], accent: [] },
        renderingCues: { materials: [], effects: [] },
      },
      guidance: [],
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('solid bright magenta background #FF00FF single tone with no gradients'),
      })
    );
  });

  it('should NOT include magenta background requirement in system prompt when isTransparent is false', async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: 'test prompt',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await composeConstructedPromptAgent({
      subject: { name: 'test', isTransparent: false },
      style: {
        name: 'test',
        palette: { primary: [], accent: [] },
        renderingCues: { materials: [], effects: [] },
      },
      guidance: [],
    });

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('DO NOT use a magenta background'),
      })
    );
  });
});

describe('createBatchMetadataAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate batch metadata based on prompt text', async () => {
    const mockMetadata = {
      name: 'Arctic Expedition Turrets',
      description: 'A collection of turrets designed for cold environments.',
    };

    vi.mocked(generateText).mockResolvedValue({
      experimental_output: mockMetadata,
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    const result = await createBatchMetadataAgent('snowy turret in the arctic');

    expect(result).toEqual(mockMetadata);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('snowy turret in the arctic'),
      })
    );
  });

  it('should include naming guidelines in system prompt', async () => {
    vi.mocked(generateText).mockResolvedValue({
      experimental_output: { name: 'Test', description: 'Test' },
      text: '',
      finishReason: 'stop',
      usage: { promptTokens: 0, completionTokens: 0 },
    } as any);

    await createBatchMetadataAgent('test');

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('catchy, professional name'),
      })
    );
  });
});
