import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { buildAgentErrorResponse } from '../utils';

const ollama = { provider: 'ollama', model: 'qwen' } as const;

describe('buildAgentErrorResponse', () => {
  it('passes ApiError status and message through instead of treating it as a model failure', () => {
    const response = buildAgentErrorResponse(new ApiError(404, 'Subject not found'), ollama, 'Failed to compose prompt') as unknown as {
      data: { error: string };
      status: number;
    };

    expect(response.status).toBe(404);
    expect(response.data.error).toBe('Subject not found');
  });

  it('falls back to a 500 with the error message for other errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = buildAgentErrorResponse(new Error('model exploded'), ollama, 'Failed') as unknown as {
      data: { error: string };
      status: number;
    };

    expect(response.status).toBe(500);
    expect(response.data.error).toBe('model exploded');
  });
});
