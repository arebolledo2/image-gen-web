import { describe, expect, it } from 'vitest';
import { getResolutionPresetsForProvider } from '../resolution-presets';

describe('resolution presets', () => {
  it('only exposes official GPT Image 2 sizes for OpenAI', () => {
    const openAIResolutions = getResolutionPresetsForProvider('openai').map((preset) => preset.id);

    expect(openAIResolutions).toEqual(['1024x1024', '1024x1536', '1536x1024']);
  });
});
