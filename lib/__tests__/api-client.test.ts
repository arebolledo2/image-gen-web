import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiClientError, errorMessage, request } from '../api-client';

function mockFetch(body: unknown, init: { status?: number; json?: boolean } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    json: init.json === false ? () => Promise.reject(new Error('not json')) : () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('sends JSON bodies with a content type', async () => {
    const fetchMock = mockFetch({ ok: true });
    await request('/api/x', { method: 'POST', body: { a: 1 } });

    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      method: 'POST',
      signal: undefined,
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it('omits headers and body when there is no payload', async () => {
    const fetchMock = mockFetch({});
    await request('/api/x');

    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it('builds a query string and skips undefined values', async () => {
    const fetchMock = mockFetch({});
    await request('/api/x', { query: { a: 1, b: undefined, c: true } });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/x?a=1&c=true');
  });

  it('throws ApiClientError with the server message and status', async () => {
    mockFetch({ error: 'Guidance not found' }, { status: 404 });

    await expect(request('/api/guidance/x')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Guidance not found',
      status: 404,
    });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockFetch(undefined, { status: 502, json: false });

    const error = (await request('/api/x').catch((e: unknown) => e)) as ApiClientError;
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.message).toBe('Request failed (502)');
  });
});

describe('api resources', () => {
  it('unwraps the guidance envelope', async () => {
    mockFetch({ guidance: [{ id: 'g1' }] });
    expect(await api.guidance.list()).toEqual([{ id: 'g1' }]);
  });

  it('sends favoritesOnly as a query param for styles', async () => {
    const fetchMock = mockFetch({ styles: [] });
    await api.styles.list({ favoritesOnly: true });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/styles?favoritesOnly=true');
  });

  it('uses PATCH for style updates', async () => {
    const fetchMock = mockFetch({ style: { id: 's1' } });
    await api.styles.update('s1', { name: 'New' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/styles/s1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"name":"New"}' });
  });
});

describe('subjects, categories, prompts and agents', () => {
  it('sends null categoryId to mean uncategorized', async () => {
    const fetchMock = mockFetch({ subject: { id: 's1' } });
    await api.subjects.update('s1', { categoryId: null });

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"categoryId":null}' });
  });

  it('unwraps categories and prompts envelopes', async () => {
    mockFetch({ categories: [{ id: 'c1' }] });
    expect(await api.subjectCategories.list()).toEqual([{ id: 'c1' }]);

    mockFetch({ prompts: [{ id: 'p1' }] });
    expect(await api.prompts.list()).toEqual([{ id: 'p1' }]);
  });

  it('returns the full compose-prompt response so callers get promptId too', async () => {
    mockFetch({ promptText: 'a robot', promptId: 'p9' });
    const result = await api.agents.composePrompt({ subjectId: 's', guidanceIds: [], aiConfig: {} });

    expect(result).toEqual({ promptText: 'a robot', promptId: 'p9' });
  });

  it('surfaces agent errors with the server message', async () => {
    mockFetch({ error: 'Model unavailable' }, { status: 503 });
    await expect(api.agents.adjustPrompt({ basePrompt: 'x', suggestion: 'y', aiConfig: {} })).rejects.toMatchObject({
      message: 'Model unavailable',
      status: 503,
    });
  });
});

describe('errorMessage', () => {
  it('returns the message of an Error and a fallback otherwise', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('weird', 'Failed to save')).toBe('Failed to save');
  });
});
