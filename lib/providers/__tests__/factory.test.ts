import { describe, expect, it } from 'vitest';
import { getProvider } from '../factory';

describe('provider factory', () => {
  it('returns the OpenAI image provider', () => {
    expect(getProvider('openai').name).toBe('openai');
  });
});
