import { afterEach, describe, expect, it, vi } from 'vitest';
import { agentErrorMessage, api, ApiClientError, errorMessage, request } from '../api-client';

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

describe('images and batches', () => {
  it('serialises image list filters, dropping undefined ones', async () => {
    const fetchMock = mockFetch({ images: [], total: 0, hasMore: false });
    await api.images.list({ batchId: 'b1', limit: 20, offset: 40, favoritesOnly: undefined });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/images?batchId=b1&limit=20&offset=40');
  });

  it('passes editId and animationId as query params on DELETE', async () => {
    const fetchMock = mockFetch({ success: true });
    await api.images.deleteEdit('i1', 'e1');
    await api.images.deleteAnimation('i1', 'a1');

    expect(fetchMock.mock.calls[0][0]).toBe('/api/images/i1/edits?editId=e1');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/images/i1/squish?animationId=a1');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('returns the transparency result as-is so callers can handle success: false', async () => {
    mockFetch({ success: false, alreadyTransparent: true, message: 'Click a visible area' });
    const result = await api.images.makeTransparent('i1', { tolerance: 30 });

    expect(result).toMatchObject({ success: false, alreadyTransparent: true });
  });

  it('keeps pagination alongside the batch list', async () => {
    mockFetch({ batches: [{ id: 'b1' }], pagination: { page: 1, limit: 9, totalCount: 1, totalPages: 1 } });
    const result = await api.batches.list({ page: 1, limit: 9 });

    expect(result.pagination.totalPages).toBe(1);
    expect(result.batches).toHaveLength(1);
  });
});

describe('agentErrorMessage', () => {
  it('joins error, remediation and provider details from the response body', () => {
    const error = new ApiClientError('Failed', 503, {
      error: 'Model failed.',
      remediation: 'Start Ollama.',
      provider: 'ollama',
      model: 'qwen',
    });

    expect(agentErrorMessage(error, 'fallback')).toBe('Model failed. Start Ollama. Provider: ollama, model: qwen');
  });

  it('falls back to the error message, then the fallback', () => {
    expect(agentErrorMessage(new ApiClientError('Server said no', 500), 'fallback')).toBe('Server said no');
    expect(agentErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});

describe('errorMessage', () => {
  it('returns the message of an Error and a fallback otherwise', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('weird', 'Failed to save')).toBe('Failed to save');
  });
});

describe('audio', () => {
  it('lists audio files with the favorites and batch filters the route expects', async () => {
    const fetchMock = mockFetch({ audioFiles: [{ id: 'a1' }] });
    const files = await api.audio.list({ batchId: 'b1', favoritesOnly: true, search: '' });

    expect(files).toEqual([{ id: 'a1' }]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/audio?batchId=b1&favorites=true');
  });

  it('omits batchId when it is null', async () => {
    const fetchMock = mockFetch({ audioFiles: [] });
    await api.audio.list({ batchId: null, favoritesOnly: false, search: 'boom' });

    expect(fetchMock.mock.calls[0][0]).toBe('/api/audio?favorites=false&search=boom');
  });

  it('unwraps the audioBatch envelope on create and version', async () => {
    mockFetch({ audioBatch: { id: 'ab1' } });
    expect(await api.audioBatches.createVersion('ab0')).toEqual({ id: 'ab1' });

    const fetchMock = mockFetch({ audioBatch: { id: 'ab2' } });
    await api.audioBatches.create({ name: 'n', provider: 'elevenlabs', defaults: {}, prompts: [{ promptText: 'x' }] });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
  });

  it('surfaces the draft-only error from prompt edits', async () => {
    mockFetch({ error: 'Cannot edit prompts for non-draft audio batches' }, { status: 400 });

    await expect(api.audioBatchPrompts.updateText('p1', 'x')).rejects.toMatchObject({
      message: 'Cannot edit prompts for non-draft audio batches',
      status: 400,
    });
  });
});
