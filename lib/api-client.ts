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
import type { AIRequestConfigInput } from '@/lib/ai/config';
import type {
  ApiGuidance,
  ApiGuidanceDetail,
  ApiPrompt,
  ApiStyle,
  ApiStyleBatch,
  ApiStyleDetail,
  ApiStyleSummary,
  ApiSubject,
  ApiSubjectCategory,
  ApiSubjectDetail,
  ApiSubjectImage,
  ApiSubjectSummary,
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

export interface SubjectInput {
  name: string;
  description?: string;
  isTransparent?: boolean;
  /** `null` means uncategorized */
  categoryId?: string | null;
}

export interface CategoryInput {
  name: string;
  color?: string;
  description?: string;
}

/** AI model overrides forwarded to agent routes (see `useAIModelSettings().toRequestConfig`). */
type AiConfig = AIRequestConfigInput;

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

  subjects: {
    list: async (options: { categoryId?: string; favoritesOnly?: boolean } = {}) =>
      (await request<{ subjects: ApiSubjectSummary[] }>('/api/subjects', { query: options })).subjects,
    get: async (id: string) => (await request<{ subject: ApiSubjectDetail }>(`/api/subjects/${id}`)).subject,
    create: async (data: SubjectInput) =>
      (await request<{ subject: ApiSubject }>('/api/subjects', { method: 'POST', body: data })).subject,
    update: async (id: string, data: Partial<SubjectInput>) =>
      (await request<{ subject: ApiSubject }>(`/api/subjects/${id}`, { method: 'PATCH', body: data })).subject,
    remove: (id: string) => request<{ success: true }>(`/api/subjects/${id}`, { method: 'DELETE' }),
    createVersion: async (id: string) =>
      (await request<{ subject: ApiSubject }>(`/api/subjects/${id}/version`, { method: 'POST' })).subject,
    toggleFavorite: async (id: string) =>
      (await request<{ subject: ApiSubject }>(`/api/subjects/${id}/favorite`, { method: 'PATCH' })).subject,
    images: async (id: string) =>
      (await request<{ images: ApiSubjectImage[] }>(`/api/subjects/${id}/images`)).images,
  },

  subjectCategories: {
    list: async () =>
      (await request<{ categories: ApiSubjectCategory[] }>('/api/subject-categories')).categories,
    create: async (data: CategoryInput) =>
      (await request<{ category: ApiSubjectCategory }>('/api/subject-categories', { method: 'POST', body: data })).category,
    remove: (id: string) => request<{ success: true }>(`/api/subject-categories/${id}`, { method: 'DELETE' }),
  },

  prompts: {
    list: async () => (await request<{ prompts: ApiPrompt[] }>('/api/prompts')).prompts,
    get: async (id: string) => (await request<{ prompt: ApiPrompt }>(`/api/prompts/${id}`)).prompt,
    create: async (data: {
      name: string;
      styleId: string;
      subjectId: string;
      guidanceIds?: string[];
      promptStyle?: string;
    }) => (await request<{ prompt: ApiPrompt }>('/api/prompts', { method: 'POST', body: data })).prompt,
    remove: (id: string) => request<{ success: true }>(`/api/prompts/${id}`, { method: 'DELETE' }),
  },

  batches: {
    create: async (data: {
      name: string;
      description?: string;
      provider: string;
      defaults?: { count?: number; resolution?: string };
      prompts: { promptText: string; promptId?: string; overrides?: { count?: number } }[];
    }) => (await request<{ batch: { id: string } }>('/api/batches', { method: 'POST', body: data })).batch,
  },

  agents: {
    createSubject: async (concept: string, aiConfig: AiConfig) =>
      (await request<{ subject: { name: string; description: string } }>('/api/agents/create-subject', {
        method: 'POST',
        body: { concept, aiConfig },
      })).subject,
    composePrompt: (data: {
      styleId?: string;
      subjectId: string;
      guidanceIds: string[];
      promptStyle?: string;
      aiConfig: AiConfig;
    }) => request<{ promptText: string; promptId?: string }>('/api/agents/compose-prompt', { method: 'POST', body: data }),
    adjustPrompt: async (data: { basePrompt: string; suggestion: string; promptStyle?: string; aiConfig: AiConfig }) =>
      (await request<{ promptText: string }>('/api/agents/adjust-prompt', { method: 'POST', body: data })).promptText,
    suggestVariations: async (data: { basePrompt: string; context: string; isTransparent: boolean; aiConfig: AiConfig }) =>
      (await request<{ variations: string[] }>('/api/agents/suggest-variations', { method: 'POST', body: data })).variations,
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
