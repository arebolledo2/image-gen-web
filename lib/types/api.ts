/**
 * API response types shared by the client.
 *
 * These are derived from the database schema so they cannot drift from it. JSON has no Date,
 * so every Date becomes an ISO string (`Serialized`). Import from here instead of declaring
 * `interface Style { ... }` inside a page.
 *
 * Type-only imports: nothing from the schema (or drizzle) ends up in the client bundle.
 */
import type {
  AudioBatch,
  AudioBatchPrompt,
  AudioFile,
  AudioGeneration,
  Batch,
  BatchPrompt,
  ComposerLayout,
  Generation,
  Guidance,
  Image,
  ImageEdit,
  Prompt,
  SquishAnimation,
  Style,
  Subject,
  SubjectCategory,
} from '@/lib/db/schema';

/** What a value looks like after `JSON.stringify` → `JSON.parse`. */
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

// -----------------------------------------------------------------------------
// Guidance
// -----------------------------------------------------------------------------

export type ApiGuidance = Serialized<Guidance>;

/** GET /api/guidance/[id] */
export type ApiGuidanceDetail = ApiGuidance & {
  parentGuidance: ApiGuidance | null;
  childGuidances: ApiGuidance[];
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

export type StylePalette = Style['palette'];
export type StyleRenderingCues = Style['renderingCues'];

/**
 * A style as returned by the API. Rows created before palettes/cues were structured still hold
 * plain string arrays, so both shapes are possible; use `isStructuredPalette` to narrow.
 */
export type ApiStyle = Omit<Serialized<Style>, 'palette' | 'renderingCues'> & {
  palette: StylePalette | string[];
  renderingCues: StyleRenderingCues | string[];
};

/** GET /api/styles (latest version of each family) */
export type ApiStyleSummary = ApiStyle & { versionCount: number; previews: { id: string }[] };

/** GET /api/styles/[id] */
export type ApiStyleDetail = ApiStyle & {
  parentStyle: ApiStyle | null;
  childStyles: ApiStyle[];
};

/** GET /api/styles/[id]/batches */
export interface ApiStyleBatch {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  generations: { images: { id: string; fileName: string }[] }[];
}

export const isStructuredPalette = (palette: ApiStyle['palette']): palette is StylePalette =>
  !Array.isArray(palette);

export const isStructuredCues = (cues: ApiStyle['renderingCues']): cues is StyleRenderingCues =>
  !Array.isArray(cues);

// -----------------------------------------------------------------------------
// Subjects
// -----------------------------------------------------------------------------

export type ApiSubjectCategory = Serialized<SubjectCategory>;
export type ApiSubject = Serialized<Subject>;

/** GET /api/subjects (latest version of each family) */
export type ApiSubjectSummary = ApiSubject & { versionCount: number; previews: { id: string }[] };

/** GET /api/subjects/[id] */
export type ApiSubjectDetail = ApiSubject & {
  parentSubject: ApiSubject | null;
  childSubjects: ApiSubject[];
};

/** GET /api/subjects/[id]/images */
export interface ApiSubjectImage {
  id: string;
  fileName: string;
  createdAt: string;
  generation: { batch: { id: string; name: string } };
}

// -----------------------------------------------------------------------------
// Prompts
// -----------------------------------------------------------------------------

/** GET /api/prompts and GET /api/prompts/[id] */
export type ApiPrompt = Serialized<Prompt> & {
  style: ApiStyle | null;
  subject: ApiSubject | null;
  promptGuidance: { guidance: ApiGuidance | null }[];
};

// -----------------------------------------------------------------------------
// Batches
// -----------------------------------------------------------------------------

export type ApiBatch = Serialized<Batch>;
export type ApiBatchPrompt = Serialized<BatchPrompt>;
export type ApiGeneration = Serialized<Generation>;

export interface ApiPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/** GET /api/batches: a trimmed batch with just enough to render a card */
export type ApiBatchSummary = ApiBatch & {
  batchPrompts: Pick<ApiBatchPrompt, 'id' | 'promptText' | 'order'>[];
  generations: (Pick<ApiGeneration, 'id' | 'status'> & { images: Pick<ApiImage, 'id' | 'fileName'>[] })[];
};

/** GET /api/batches/[id] */
export type ApiBatchDetail = ApiBatch & {
  parentBatch: ApiBatch | null;
  childBatches: ApiBatch[];
  batchPrompts: (ApiBatchPrompt & { prompt: ApiPrompt | null })[];
  generations: (ApiGeneration & { images: ApiImage[] })[];
};

/** GET /api/batches/[id]/lineage-images */
export interface ApiLineageImage {
  id: string;
  fileName: string;
  filePath: string;
  promptText: string;
  batchId: string;
  batchName: string;
  batchVersion: number;
}

export interface ApiLineageImages {
  images: ApiLineageImage[];
  hasLineage: boolean;
  parentBatchIds?: string[];
}

// -----------------------------------------------------------------------------
// Images and their derived files
// -----------------------------------------------------------------------------

export type ApiImage = Serialized<Image>;
export type ApiSquishAnimation = Serialized<SquishAnimation>;
export type ApiImageEdit = Serialized<ImageEdit>;

/** GET /api/images (the list route attaches the generation, its batch and batch prompt) */
export type ApiImageListItem = ApiImage & {
  generation: ApiGeneration & { batch: ApiBatch; batchPrompt: ApiBatchPrompt };
};

/** GET /api/images */
export interface ApiImageList {
  images: ApiImageListItem[];
  total: number;
  hasMore: boolean;
}

/** GET /api/images/[id]: an image with the style, subject and guidance that produced it */
export interface ApiImageDetail {
  id: string;
  filePath: string;
  fileName: string;
  mediaType: string;
  isFavorite: boolean;
  transparentFilePath: string | null;
  flippedFilePath: string | null;
  createdAt: string;
  generation: {
    batch: { id: string; name: string } | null;
    batchPrompt: {
      id: string;
      promptText: string;
      prompt: {
        style: { id: string; name: string } | null;
        subject: { id: string; name: string } | null;
        guidance: { id: string; name: string }[];
      } | null;
    } | null;
  };
}

/** POST /api/images/[id]/transparent and /api/image-edits/[id]/transparent */
export type ApiTransparencyResult =
  | { success: true; transparentFilePath?: string; transparentEditPath?: string }
  | {
      success: false;
      /** The click landed on a transparent area and no visible pixel could be sampled */
      alreadyTransparent: true;
      message: string;
      transparentFilePath?: string | null;
      transparentEditPath?: string | null;
    };

// -----------------------------------------------------------------------------
// Composer
// -----------------------------------------------------------------------------

export type ApiComposerLayout = Serialized<ComposerLayout>;

// -----------------------------------------------------------------------------
// Audio
// -----------------------------------------------------------------------------

export type ApiAudioProvider = AudioBatch['provider'];
export type ApiAudioBatchDefaults = NonNullable<AudioBatch['defaults']>;
export type ApiAudioBatchPrompt = Serialized<AudioBatchPrompt>;
export type ApiAudioFile = Serialized<AudioFile>;
export type ApiAudioGeneration = Serialized<AudioGeneration> & { audioFiles: ApiAudioFile[] };

/** GET /api/audio-batches (items) */
export type ApiAudioBatchSummary = Serialized<AudioBatch> & {
  audioBatchPrompts: ApiAudioBatchPrompt[];
  audioGenerations: ApiAudioGeneration[];
};

/** GET /api/audio-batches/[id] */
export type ApiAudioBatchDetail = Serialized<AudioBatch> & {
  parentAudioBatch: Serialized<AudioBatch> | null;
  childAudioBatches: Serialized<AudioBatch>[];
  audioBatchPrompts: ApiAudioBatchPrompt[];
  audioGenerations: ApiAudioGeneration[];
};

/** GET /api/audio (items) */
export type ApiAudioFileListItem = ApiAudioFile & {
  audioGeneration:
    | (Serialized<AudioGeneration> & {
        audioBatch: Serialized<AudioBatch>;
        audioBatchPrompt: ApiAudioBatchPrompt | null;
      })
    | null;
};
