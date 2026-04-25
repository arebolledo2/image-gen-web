import { describe, expect, it } from 'vitest';
import { getResolutionPresetsForProvider } from '../resolution-presets';

describe('resolution presets', () => {
  it('only exposes official GPT Image 2 sizes for OpenAI', () => {
    const openAIResolutions = getResolutionPresetsForProvider('openai').map((preset) => preset.id);

    expect(openAIResolutions).toEqual(['1024x1024', '1024x1536', '1536x1024']);
  });

  it('exposes practical OpenRouter image_config resolutions', () => {
    const openRouterResolutions = getResolutionPresetsForProvider('openrouter').map((preset) => preset.id);

    expect(openRouterResolutions).toEqual([
      '1024x1024',
      '2048x2048',
      '4096x4096',
      '1024x1536',
      '2048x3072',
      '1536x1024',
      '3072x2048',
      '3840x2160',
    ]);
  });
});
