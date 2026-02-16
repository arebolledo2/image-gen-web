# Image Gen Web — API Reference

RESTful API built with Next.js Route Handlers. All routes live under `app/api/`. Business logic is delegated to services in `lib/services/`. All requests and responses use JSON. Errors return `{ error: string }` with appropriate HTTP status codes.

---

## Style Management

### `/api/styles`

| Method | Description |
|--------|-------------|
| `GET` | List all latest styles |
| `POST` | Create style — body: `{ name, palette, renderingCues }`. If `parentStyleId` provided, creates a new version. |

### `/api/subjects`

| Method | Description |
|--------|-------------|
| `GET` | List all latest subjects |
| `POST` | Create subject — body: `{ name, description, categoryId?, isTransparent? }`. Supports versioning via `parentSubjectId`. |

### `/api/subject-categories`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/subject-categories` | List all categories |
| `POST` | `/api/subject-categories` | Create category — body: `{ name, color?, description? }` |
| `GET` | `/api/subject-categories/[id]` | Get category with its subjects |
| `PATCH` | `/api/subject-categories/[id]` | Update category |
| `DELETE` | `/api/subject-categories/[id]` | Delete category |

### `/api/guidance`

| Method | Description |
|--------|-------------|
| `GET` | List all guidance modifiers |
| `POST` | Create guidance — body: `{ name, description }`. Supports versioning via `parentGuidanceId`. |

---

## Prompt Management

### `/api/prompts`

| Method | Description |
|--------|-------------|
| `GET` | List all prompts with relations |
| `POST` | Create prompt — body: `{ name, styleId, subjectId, guidanceIds?, promptText? }`. Server composes text using AI if not provided directly. |

---

## Image Batch System

### `/api/batches`

| Method | Description |
|--------|-------------|
| `GET` | List all batches |
| `POST` | Create batch — body: `{ name, provider, prompts: [{ promptText, overrides? }], defaults? }` |

### `/api/batches/[id]/execute`

| Method | Description |
|--------|-------------|
| `POST` | Start batch generation via Inngest |

### `/api/batch-prompts/[id]`

| Method | Description |
|--------|-------------|
| `PATCH` | Update prompt text — body: `{ promptText }`. Only works when parent batch is in `draft` status. |

### `/api/images`

Image metadata and operations:

- `POST /api/images/[id]/transparent` — Generate transparent version (removes magenta background)
- `POST /api/images/[id]/flip` — Create horizontally flipped version
- Toggle favorites

### `/api/squish-animations`

| Method | Description |
|--------|-------------|
| `POST` | Create squish animation — body: `{ imageId, intensity, animationType, generatedBy, aiPrompt? }` |

### `/api/image-edits`

| Method | Description |
|--------|-------------|
| `POST` | AI-powered image editing — body: `{ imageId, sourceVersion, userPrompt }` |

---

## Audio Batch System

### `/api/audio-batches`

| Method | Description |
|--------|-------------|
| `GET` | List all audio batches |
| `POST` | Create audio batch — body: `{ name, provider, prompts: [string], defaults? }` |

### `/api/audio-batches/[id]/execute`

| Method | Description |
|--------|-------------|
| `POST` | Start audio batch generation |

### `/api/audio-batch-prompts/[id]`

| Method | Description |
|--------|-------------|
| `PATCH` | Update audio prompt text — body: `{ promptText }`. Only works when parent batch is in `draft` status. |

### `/api/audio`

Audio file metadata access and operations.

---

## Export

### `/api/export/batches`

| Method | Description |
|--------|-------------|
| `GET` | Search/filter batches for external tools |

Query params: `search`, `status`, `includeImageCount`, `limit`, `offset`.

Returns: `{ batches, count, limit, offset }`

### `/api/export/batches/[id]/download`

| Method | Description |
|--------|-------------|
| `GET` | Download all batch images as ZIP |

Query params: `includeTransparent` (default `true`), `includeFlipped` (default `false`), `includeMetadata` (default `true`).

Returns: `application/zip`

### `/api/export/batches/[id]/images`

| Method | Description |
|--------|-------------|
| `GET` | List batch images with computed URLs |

Returns: `{ batchId, batchName, batchStatus, images[], count }`. Each image includes `downloadUrl`, `transparentUrl`, `flippedUrl`, `thumbnailUrl`, `promptText`, `generationStatus`.

---

## AI Agents

All agent endpoints accept `POST` requests.

| Endpoint | Agent |
|----------|-------|
| `/api/agents/compose-prompt` | composeConstructedPromptAgent |
| `/api/agents/create-style` | createStyleAgent |
| `/api/agents/edit-style` | editStyleAgent |
| `/api/agents/create-prompt` | createPromptAgent |
| `/api/agents/adjust-prompt` | adjustPromptAgent |
| `/api/agents/suggest-variations` | suggestPromptVariations |
| `/api/agents/create-subject` | createSubjectAgent |
| `/api/agents/create-batch-metadata` | createBatchMetadataAgent |
| `/api/agents/create-audio-prompt` | createAudioPromptAgent |

---

## Chat

### `/api/chat`

| Method | Description |
|--------|-------------|
| `POST` | Chat with ToolLoopAgent — body: `{ messages }`. maxDuration: 30s. Streams responses via `createAgentUIStreamResponse`. Combines querying and creation capabilities. |

---

## Infrastructure

### `/api/inngest`

`GET`, `POST`, `PUT` — Inngest webhook endpoint (via `serve()`). Registers `imageGenerationFunction` and `audioGenerationFunction`. Not called directly — used by Inngest runtime.

### `/api/providers`

| Method | Description |
|--------|-------------|
| `GET` | Image generation provider info |

---

## Common Response Patterns

**Success:**

```json
{ "style": { "id": "uuid", "name": "..." } }
{ "batches": [...], "count": 10 }
```

**Error:**

```json
{ "error": "Name, palette, and renderingCues are required" }
```

**Status codes:** `200` OK · `201` Created · `400` Bad Request · `404` Not Found · `500` Internal Server Error
