# Service Layer

All business logic and database operations are encapsulated in services under `lib/services/`, exported as singletons from `lib/services/index.ts`.

## Principles

- API routes **always** use services — never access `db` directly in routes
- Services provide transaction support for atomic multi-step operations
- Services centralize versioning logic (parent-based version chains)
- All services extend `BaseService<T>` for shared CRUD and transaction utilities

## BaseService

`BaseService<T>` in `base.service.ts` provides:

- Shared transaction utilities via `db.transaction()`
- Common CRUD: `findById()`, `create()`, `update()`, `delete()`
- All specific services extend this base class

---

## Image Services

### `stylesService` — `styles.service.ts`

| Method | Description |
|---|---|
| `getLatestStyles()` | All styles ordered by creation |
| `findById(id)` | Single style lookup |
| `createStyle(data)` | Create new style |
| `createStyleVersion(parentId, data)` | Create versioned copy (auto-increments version) |
| `getStyleVersions(id)` | Get version chain for a style |

### `subjectsService` — `subjects.service.ts`

| Method | Description |
|---|---|
| `getLatestSubjects()` | All subjects |
| `findById(id)` | Single subject lookup |
| `createSubject(data)` | Create new subject |
| `createSubjectVersion(parentId, data)` | Create versioned copy |
| `getSubjectVersions(id)` | Get version chain |

### `subjectCategoriesService` — `subject-categories.service.ts`

| Method | Description |
|---|---|
| `getAllCategories()` | All categories ordered by name |
| `createCategory({ name, color?, description? })` | Create category |
| `getCategoryWithSubjects(id)` | Category with related subjects via Drizzle `with` |

Inherits `update()`, `delete()`, `findById()` from BaseService.

### `guidanceService` — `guidance.service.ts`

| Method | Description |
|---|---|
| `getLatestGuidance()` | All guidance modifiers |
| `createGuidance(data)` | Create guidance |
| `createGuidanceVersion(parentId, data)` | Create versioned copy |
| `getGuidanceVersions(id)` | Get version chain |

### `promptsService` — `prompts.service.ts`

| Method | Description |
|---|---|
| `getAllPrompts()` | All prompts with style/subject/guidance relations |
| `createPrompt(data)` | Create prompt with transactional guidance associations |
| `findById(id)` | Prompt with full relations |

Handles the `promptGuidance` join table atomically inside a transaction.

### `batchesService` — `batches.service.ts`

| Method | Description |
|---|---|
| `getAllBatches()` | All batches with metadata |
| `createBatch({ name, provider, prompts, defaults })` | Atomic: creates batch + all batchPrompts in transaction |
| `getBatchWithDetails(id)` | Returns batch + prompts + generations + images + lineage |
| `findById(id)` | Single batch lookup |

### `batchExecutionService` — `batch-execution.service.ts`

Separated from `batchesService` for single-responsibility.

| Method | Description |
|---|---|
| `updateBatchStatus(id, status, expectedVersion?)` | Status update with **optimistic concurrency control** (version check). Sets `completedAt` on `completed`/`failed`. |
| `createGenerationsForBatch(batchId)` | Creates generation placeholder records for each prompt × count. Reads `overrides.count` and `defaults.count`. Atomic transaction. |
| `getBatchCompletionStatus(batchId)` | Returns `{ total, pending, running, success, failed, isComplete, finalStatus }` |

### `imagesService` — `images.service.ts`

| Method | Description |
|---|---|
| `getImagesByBatch(batchId, options?)` | All images from a batch, optionally `favoritesOnly` |
| `getImageWithDetails(id)` | Image + generation + batch + transformations + edits |
| `getImageStatistics(batchId)` | `{ total, favorites, withTransparent, withFlipped, withAnimations, withEdits }` |

Also supports toggling favorites and updating transparent/flipped paths.

---

## Audio Services

### `audioBatchesService` — `audio-batches.service.ts`

| Method | Description |
|---|---|
| `getAllAudioBatches()` | All audio batches |
| `createAudioBatch({ name, provider, prompts, defaults })` | Atomic creation |
| `getAudioBatchWithDetails(id)` | Batch + prompts + generations + files |

Versioning support mirrors image batches.

### `audioFilesService` — `audio-files.service.ts`

Audio file metadata operations including favorite toggling and file lookup by generation.

---

## Usage Pattern

```typescript
import { batchesService } from '@/lib/services'

// Create batch with prompts atomically
const batch = await batchesService.createBatch({
  name: 'My Batch',
  prompts: [
    { promptText: 'A cyberpunk city' },
    { promptText: 'A neon samurai' }
  ]
})
// If any step fails, entire operation is rolled back

// Get batch with full details
const details = await batchesService.getBatchWithDetails(batch.id)
```

## Transaction Pattern

Services use `db.transaction()` for multi-step operations. If any step fails, the entire operation rolls back automatically. This is critical for:

- **Creating a batch** — insert batch row + all batchPrompts in one transaction
- **Creating a prompt** — insert prompt + guidance associations via join table
- **Updating batch status** — optimistic concurrency control checks the expected version before writing

```typescript
// Inside a service method
return await db.transaction(async (tx) => {
  const [batch] = await tx.insert(batches).values(data).returning()
  await tx.insert(batchPrompts).values(
    prompts.map(p => ({ batchId: batch.id, ...p }))
  )
  return batch
})
```

## Anti-Patterns

| Pattern | Why it's wrong |
|---|---|
| `db.select().from(batches)` in an API route | Bypasses service layer — no transaction safety, no centralized logic |
| Importing `db` in `app/api/` files | All DB access must go through services |
| Skipping services for "simple" queries | Even simple queries should use services for consistency and future-proofing |

Direct `db` access should only exist inside service implementations. ESLint enforces this: the
`no-restricted-imports` rule in `eslint.config.mjs` rejects `@/lib/db` imports under `app/api/` (tests excluded).

Services throw `ApiError` (`notFound`, `badRequest` from `lib/api/errors.ts`) for expected failures such
as a missing record or editing a non-draft batch; routes pass them to `handleApiError`, which turns them
into the matching HTTP status.
