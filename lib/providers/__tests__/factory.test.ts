import { describe, expect, it } from 'vitest';
import { getProvider } from '../factory';
import { ComfyUIProvider } from '../comfyui/comfyui-provider';

describe('provider factory', () => {
  it('returns the OpenAI image provider', () => {
    expect(getProvider('openai').name).toBe('openai');
  });

  it('returns the OpenRouter image provider', () => {
    expect(getProvider('openrouter').name).toBe('openrouter');
  });

  it('returns a ComfyUI provider for the zImage workflow', () => {
    const provider = getProvider('comfyui');
    expect(provider).toBeInstanceOf(ComfyUIProvider);
    expect(provider.name).toBe('comfyui');
  });

  it('returns a ComfyUI provider for the Krea workflow', () => {
    const provider = getProvider('comfyui-krea');
    expect(provider).toBeInstanceOf(ComfyUIProvider);
    expect(provider.name).toBe('comfyui');
  });
});
