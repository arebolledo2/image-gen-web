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
  ApiBatch,
  ApiBatchDetail,
  ApiBatchSummary,
  ApiComposerLayout,
  ApiGuidance,
  ApiGuidanceDetail,
  ApiImage,
  ApiImageDetail,
  ApiImageEdit,
  ApiImageList,
  ApiLineageImages,
  ApiPagination,
  ApiPrompt,
  ApiSquishAnimation,
  ApiTransparencyResult,
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

/**
 * Message for a failed AI agent call. Agent routes add `remediation`, `provider` and `model`
 * to their error body so the user can tell which model failed and what to try.
 */
export function agentErrorMessage(error: unknown, fallback: string): string {
  const body = error instanceof ApiClientError ? error.body : undefined;
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>;
    const details = [
      typeof data.error === 'string' ? data.error : undefined,
      typeof data.remediation === 'string' ? data.remediation : undefined,
      typeof data.provider === 'string' && typeof data.model === 'string'
        ? `Provider: ${data.provider}, model: ${data.model}`
        : undefined,
    ].filter(Boolean);
    if (details.length > 0) return details.join(' ');
  }
  return errorMessage(error, fallback);
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

/** A style proposed by an AI agent (not yet saved). */
export interface AiStyleDraft {
  name: string;
  description?: string | null;
  palette: StylePalette;
  renderingCues: StyleRenderingCues;
}

export interface SubjectInput {
  name: string;
  description?: string;
  isTransparent?: boolean;
  /** `null` means uncategorized */
  categoryId?: string | null;
}

/** Body of the transparency routes. */
export interface TransparencyOptions {
  tolerance?: number;
  mode?: 'global' | 'flood';
  samplePoint?: { x: number; y: number };
  displayedDimensions?: { width: number; height: number };
  forceOriginal?: boolean;
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
    list: (query: { page?: number; limit?: number; categoryId?: string; favoritesOnly?: boolean } = {}) =>
      request<{ batches: ApiBatchSummary[]; pagination: ApiPagination }>('/api/batches', { query }),
    get: async (id: string) => (await request<{ batch: ApiBatchDetail }>(`/api/batches/${id}`)).batch,
    remove: (id: string) => request<{ success: true }>(`/api/batches/${id}`, { method: 'DELETE' }),
    execute: (id: string) =>
      request<{ success: true; message: string; batchId: string }>(`/api/batches/${id}/execute`, { method: 'POST' }),
    createVersion: async (id: string) =>
      (await request<{ batch: ApiBatch }>(`/api/batches/${id}/version`, { method: 'POST' })).batch,
    toggleFavorite: async (id: string) =>
      (await request<{ batch: ApiBatch }>(`/api/batches/${id}/favorite`, { method: 'PATCH' })).batch,
    updateSettings: async (id: string, data: { provider: string; defaults: { count?: number; resolution?: string } }) =>
      (await request<{ batch: ApiBatch }>(`/api/batches/${id}/settings`, { method: 'PATCH', body: data })).batch,
    lineageImages: (id: string, limit?: number) =>
      request<ApiLineageImages>(`/api/batches/${id}/lineage-images`, { query: { limit } }),
    create: async (data: {
      name: string;
      description?: string;
      provider: string;
      defaults?: { count?: number; resolution?: string };
      prompts: { promptText: string; promptId?: string; overrides?: { count?: number } }[];
    }) => (await request<{ batch: { id: string } }>('/api/batches', { method: 'POST', body: data })).batch,
  },

  batchPrompts: {
    updateText: (id: string, promptText: string) =>
      request<{ success: true }>(`/api/batch-prompts/${id}`, { method: 'PATCH', body: { promptText } }),
  },

  images: {
    list: (filters: {
      batchId?: string;
      favoritesOnly?: boolean;
      transparentOnly?: boolean;
      search?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    } = {}) => request<ApiImageList>('/api/images', { query: filters }),
    get: (id: string) => request<ApiImageDetail>(`/api/images/${id}`),
    setFavorite: async (id: string, isFavorite: boolean) =>
      (await request<{ image: ApiImage }>(`/api/images/${id}`, { method: 'PATCH', body: { isFavorite } })).image,

    edits: async (id: string) => (await request<{ edits: ApiImageEdit[] }>(`/api/images/${id}/edits`)).edits,
    deleteEdit: (id: string, editId: string) =>
      request<{ success: true }>(`/api/images/${id}/edits`, { method: 'DELETE', query: { editId } }),
    aiEdit: (id: string, data: { sourceVersion: string; userPrompt: string }) =>
      request<{ success: boolean; edit: { id: string; generatedName: string } }>(`/api/images/${id}/ai-edit`, {
        method: 'POST',
        body: data,
      }),

    squishAnimations: async (id: string) =>
      (await request<{ animations: ApiSquishAnimation[] }>(`/api/images/${id}/squish`)).animations,
    createSquish: (id: string, data: { frameCount: number; intensity: number; animationType: 'bounce' | 'squash_stretch' }) =>
      request<{ success: boolean; animation: { id: string } }>(`/api/images/${id}/squish`, { method: 'POST', body: data }),
    deleteAnimation: (id: string, animationId: string) =>
      request<{ success: true }>(`/api/images/${id}/squish`, { method: 'DELETE', query: { animationId } }),
    createAiAnimation: (id: string, data: { prompt: string; gridSize: number }) =>
      request<{ success: boolean; animation: { id: string } }>(`/api/images/${id}/ai-animation`, {
        method: 'POST',
        body: data,
      }),
    suggestAnimation: async (id: string) =>
      (await request<{ success: boolean; suggestion: string }>(`/api/images/${id}/suggest-animation`, { method: 'POST' }))
        .suggestion,

    makeTransparent: (id: string, options: TransparencyOptions) =>
      request<ApiTransparencyResult>(`/api/images/${id}/transparent`, { method: 'POST', body: options }),
    flip: (id: string, sourceVersion: string) =>
      request<{ success: boolean; flippedFilePath: string }>(`/api/images/${id}/flip`, {
        method: 'POST',
        body: { sourceVersion },
      }),
  },

  imageEdits: {
    makeTransparent: (editId: string, options: TransparencyOptions) =>
      request<ApiTransparencyResult>(`/api/image-edits/${editId}/transparent`, { method: 'POST', body: options }),
  },

  composerLayouts: {
    list: async () => (await request<{ layouts: ApiComposerLayout[] }>('/api/composer-layouts')).layouts,
    create: async (data: { name: string; data: ApiComposerLayout['data'] }) =>
      (await request<{ layout: ApiComposerLayout }>('/api/composer-layouts', { method: 'POST', body: data })).layout,
    update: async (id: string, data: { name?: string; data?: ApiComposerLayout['data'] }) =>
      (await request<{ layout: ApiComposerLayout }>(`/api/composer-layouts/${id}`, { method: 'PATCH', body: data })).layout,
    remove: (id: string) => request<{ success: true }>(`/api/composer-layouts/${id}`, { method: 'DELETE' }),
  },

  agents: {
    createStyle: async (description: string, aiConfig: AiConfig) =>
      (await request<{ style: AiStyleDraft }>('/api/agents/create-style', {
        method: 'POST',
        body: { description, aiConfig },
      })).style,
    editStyle: async (data: { currentStyle: AiStyleDraft; userRequest: string; aiConfig: AiConfig }) =>
      (await request<{ style: AiStyleDraft }>('/api/agents/edit-style', { method: 'POST', body: data })).style,
    createBatchMetadata: (promptText: string, aiConfig: AiConfig) =>
      request<{ name: string; description: string }>('/api/agents/create-batch-metadata', {
        method: 'POST',
        body: { promptText, aiConfig },
      }),
    adjustBatchPrompts: (data: {
      batchId: string;
      suggestion: string;
      promptStyle?: string;
      referenceImageIds?: string[];
      aiConfig: AiConfig;
    }) => request<unknown>('/api/agents/adjust-batch-prompts', { method: 'POST', body: data }),
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
    adjustPrompt: async (data: {
      basePrompt: string;
      suggestion: string;
      promptStyle?: string;
      referenceImageIds?: string[];
      aiConfig: AiConfig;
    }) =>
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
    create: async (data: { name: string; description?: string; palette: StylePalette; renderingCues: StyleRenderingCues }) =>
      (await request<{ style: ApiStyle }>('/api/styles', { method: 'POST', body: data })).style,
    batches: async (id: string) =>
      (await request<{ batches: ApiStyleBatch[] }>(`/api/styles/${id}/batches`)).batches,
  },
};
