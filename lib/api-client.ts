/**
 * Typed client for the app's own API routes.
 *
 * Replaces hand-rolled `fetch` + `response.ok` + `response.json()` in pages and hooks. Failed
 * requests throw `ApiClientError` carrying the server's `error` message and HTTP status.
 *
 * @example
 * const guidance = await api.guidance.list();
 * try { await api.guidance.remove(id) } catch (e) { toast.error(errorMessage(e)) }
 */
import type {
  ApiGuidance,
  ApiGuidanceDetail,
  ApiStyle,
  ApiStyleBatch,
  ApiStyleDetail,
  ApiStyleSummary,
  StylePalette,
  StyleRenderingCues,
} from '@/lib/types/api';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Parsed JSON body of the failed response, if any */
    readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** Message suitable for a toast, for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Low-level request; prefer the resource helpers on `api`. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const response = await fetch(withQuery(path, query), {
    method,
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : undefined;
    throw new ApiClientError(serverMessage ?? `Request failed (${response.status})`, response.status, data);
  }

  return data as T;
}

export interface StyleUpdate {
  name?: string;
  description?: string | null;
  palette?: StylePalette;
  renderingCues?: StyleRenderingCues;
}

export const api = {
  guidance: {
    list: async () => (await request<{ guidance: ApiGuidance[] }>('/api/guidance')).guidance,
    get: async (id: string) =>
      (await request<{ guidance: ApiGuidanceDetail }>(`/api/guidance/${id}`)).guidance,
    create: async (data: { name: string; description: string }) =>
      (await request<{ guidance: ApiGuidance }>('/api/guidance', { method: 'POST', body: data })).guidance,
    update: async (id: string, data: { name?: string; description?: string }) =>
      (await request<{ guidance: ApiGuidance }>(`/api/guidance/${id}`, { method: 'PATCH', body: data })).guidance,
    remove: (id: string) => request<{ success: true }>(`/api/guidance/${id}`, { method: 'DELETE' }),
    createVersion: async (id: string) =>
      (await request<{ guidance: ApiGuidance }>(`/api/guidance/${id}/version`, { method: 'POST' })).guidance,
  },

  styles: {
    list: async (options: { favoritesOnly?: boolean } = {}) =>
      (await request<{ styles: ApiStyleSummary[] }>('/api/styles', { query: options })).styles,
    get: async (id: string) => (await request<{ style: ApiStyleDetail }>(`/api/styles/${id}`)).style,
    update: async (id: string, data: StyleUpdate) =>
      (await request<{ style: ApiStyle }>(`/api/styles/${id}`, { method: 'PATCH', body: data })).style,
    remove: (id: string) => request<{ success: true }>(`/api/styles/${id}`, { method: 'DELETE' }),
    createVersion: async (id: string) =>
      (await request<{ style: ApiStyle }>(`/api/styles/${id}/version`, { method: 'POST' })).style,
    toggleFavorite: async (id: string) =>
      (await request<{ style: ApiStyle }>(`/api/styles/${id}/favorite`, { method: 'PATCH' })).style,
    batches: async (id: string) =>
      (await request<{ batches: ApiStyleBatch[] }>(`/api/styles/${id}/batches`)).batches,
  },
};
