/**
 * API response types shared by the client.
 *
 * These are derived from the database schema so they cannot drift from it. JSON has no Date,
 * so every Date becomes an ISO string (`Serialized`). Import from here instead of declaring
 * `interface Style { ... }` inside a page.
 *
 * Type-only imports: nothing from the schema (or drizzle) ends up in the client bundle.
 */
import type { Guidance, Prompt, Style, Subject, SubjectCategory } from '@/lib/db/schema';

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
