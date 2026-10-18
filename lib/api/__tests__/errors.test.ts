import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, handleApiError, parseBody, notFound } from '../errors';

// vitest.setup.ts mocks NextResponse.json as `{ data, ...init }`
type MockResponse = { data: unknown; status: number };

const schema = z.object({ count: z.number().min(1, 'Count must be positive').default(3) });

function jsonRequest(body: string) {
  return new Request('http://localhost/test', { method: 'POST', body });
}

describe('parseBody', () => {
  it('applies defaults', async () => {
    expect(await parseBody(jsonRequest('{}'), schema)).toEqual({ count: 3 });
  });

  it('throws a 400 with the schema message', async () => {
    await expect(parseBody(jsonRequest('{"count":0}'), schema)).rejects.toMatchObject({
      status: 400,
      message: 'Count must be positive',
    });
  });

  it('throws a 400 on malformed JSON', async () => {
    await expect(parseBody(jsonRequest('{nope'), schema)).rejects.toMatchObject({
      status: 400,
      message: 'Invalid JSON body',
    });
  });
});

describe('handleApiError', () => {
  it('maps ApiError to its status', async () => {
    const response = handleApiError(notFound('Image'), 'x') as unknown as MockResponse;
    expect(response.status).toBe(404);
    expect(response.data).toEqual({ error: 'Image not found' });
  });

  it('returns 500 without a stack trace for unknown errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = handleApiError(new Error('boom'), 'flip image') as unknown as MockResponse;

    expect(response.status).toBe(500);
    expect(response.data).toEqual({ error: 'Failed to flip image', details: 'boom' });
    spy.mockRestore();
  });

  it('includes extra fields from ApiError', async () => {
    const response = handleApiError(new ApiError(409, 'Conflict', { code: 'dup' }), 'x') as unknown as MockResponse;
    expect(response.data).toEqual({ error: 'Conflict', code: 'dup' });
  });
});
