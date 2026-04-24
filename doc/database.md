# Database Schema

## Overview

The image-gen-web project uses **PostgreSQL** managed via **Drizzle ORM**.

| Item | Path |
|---|---|
| Schema definition | `lib/db/schema.ts` (474 lines) |
| Connection setup | `lib/db/index.ts` |
| Tables | 15 |
| Enums | 6 |
| Type exports | 32 (Select + Insert per table) |

## Enums

| Enum | Values |
|---|---|
| `batchStatusEnum` | `draft`, `queued`, `running`, `completed`, `failed` |
| `generationStatusEnum` | `pending`, `running`, `success`, `failed` |
| `providerEnum` | `openai`, `gemini`, `gemini3`, `comfyui` |
| `audioProviderEnum` | `audiocraft`, `elevenlabs` |
| `animationTypeEnum` | `bounce`, `squash_stretch` |
| `animationGeneratorEnum` | `manual`, `ai` |

## Tables

### Style System

| Table | Key Columns | Notes |
|---|---|---|
| `styles` | name, version, parentStyleId (self-ref), palette (JSON), renderingCues (JSON), isFavorite | Versioned chain via `parentStyleId` |
| `subjectCategories` | name, color, description | Organizational grouping for subjects |
| `subjects` | name, version, parentSubjectId (self-ref), categoryId (→ subjectCategories), isTransparent, isFavorite | Versioned chain via `parentSubjectId` |
| `guidance` | name, version, parentGuidanceId (self-ref), description | Prompt modifiers, versioned |

### Prompt System

| Table | Key Columns | Notes |
|---|---|---|
| `prompts` | name, styleId (→ styles), subjectId (→ subjects), promptText | Cached composed text from style + subject + guidance |
| `promptGuidance` | promptId (→ prompts), guidanceId (→ guidance) | Many-to-many join table |

### Image Batch System

| Table | Key Columns | Notes |
|---|---|---|
| `batches` | name, version, parentBatchId (self-ref), status (`batchStatusEnum`), provider (`providerEnum`), defaults (JSON), isFavorite, completedAt | Versioned chain via `parentBatchId` |
| `batchPrompts` | batchId (→ batches), promptId? (→ prompts), promptText, overrides (JSON), order | Links prompts to batches with override support; `promptId` is optional |
| `generations` | batchId (→ batches), batchPromptId (→ batchPrompts), status (`generationStatusEnum`), runNumber, metadata (JSON), error | One generation per prompt execution attempt |
| `images` | generationId (→ generations), filePath, fileName, mediaType, fileSize, metadata (JSON), isFavorite, transparentFilePath, flippedFilePath | Stores generated image files and processed variants |
| `squishAnimations` | imageId (→ images), spritesheetPath, frameCount, intensity, animationType (`animationTypeEnum`), generatedBy (`animationGeneratorEnum`), aiPrompt, fullAiPrompt, metadata (JSON) | Sprite animation data derived from images |
| `imageEdits` | imageId (→ images), sourceVersion, editedFilePath, transparentEditPath, userPrompt, fullAiPrompt, generatedName, metadata (JSON) | AI-assisted image edit history |

### Audio Batch System

| Table | Key Columns | Notes |
|---|---|---|
| `audioBatches` | name, version, parentAudioBatchId (self-ref), status (`batchStatusEnum`), provider (`audioProviderEnum`), defaults (JSON) | Versioned chain via `parentAudioBatchId` |
| `audioBatchPrompts` | audioBatchId (→ audioBatches), promptText, overrides (JSON), order | Audio prompts within a batch |
| `audioGenerations` | audioBatchId (→ audioBatches), audioBatchPromptId (→ audioBatchPrompts), status (`generationStatusEnum`), runNumber, metadata (JSON), error | Audio generation execution records |
| `audioFiles` | audioGenerationId (→ audioGenerations), filePath, fileName, mediaType, fileSize, duration, sampleRate, isFavorite | Generated audio file metadata |

## Relations Summary

```
styles ──┐ (self-ref version chain)
         └──→ prompts
subjects ──┐ (self-ref version chain)
           ├──→ subjectCategories
           └──→ prompts
guidance ──┐ (self-ref version chain)
           └──→ promptGuidance ←── prompts
batches ──┐ (self-ref version chain)
          ├──→ batchPrompts ←── prompts (optional)
          └──→ generations ──→ images ──→ squishAnimations
                                      └──→ imageEdits
audioBatches ──┐ (self-ref version chain)
               ├──→ audioBatchPrompts
               └──→ audioGenerations ──→ audioFiles
```

## Versioning Pattern

Styles, subjects, guidance, and batches all implement a **self-referencing version chain**. Each table has a `parentXId` column (foreign key to itself) and a `version` integer column.

**How it works:**

1. The initial record has `version = 1` and `parentXId = null`.
2. Creating a new version sets `parentXId` to the previous record's ID and increments `version`.
3. This forms a linked list of versions for each logical entity.

**Accessing versions:** Each versioned entity has a corresponding `getXVersions()` service method that traverses the chain to return the full version history.

**Versioned tables:** `styles`, `subjects`, `guidance`, `batches`, `audioBatches`.

## Type Exports

Each table exports both a **Select** type and an **Insert** type, totaling **32 type exports**:

```typescript
// Example from styles table
export type Style = typeof styles.$inferSelect;
export type NewStyle = typeof styles.$inferInsert;
```

These types provide type-safe database operations throughout the codebase — service methods, API routes, and UI components all reference them for consistent typing.

## Common Schema Operations

| Command | Description |
|---|---|
| `npm run db:push` | Sync schema directly to database (development) |
| `npm run db:generate` | Generate SQL migration files from schema changes |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio GUI for visual database browsing |

**Workflow for schema changes:**

1. Edit `lib/db/schema.ts`
2. Run `npm run db:push` (development) or `npm run db:generate` → `npm run db:migrate` (production)
3. Update affected services in `lib/services/` as needed
