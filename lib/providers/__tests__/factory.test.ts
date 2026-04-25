import { describe, expect, it } from 'vitest';
import { getProvider } from '../factory';

describe('provider factory', () => {
  it('returns the OpenAI image provider', () => {
    expect(getProvider('openai').name).toBe('openai');
  });

  it('returns the OpenRouter image provider', () => {
    expect(getProvider('openrouter').name).toBe('openrouter');
  });
});
