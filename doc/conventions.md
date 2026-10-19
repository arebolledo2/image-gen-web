# Image Gen Web — Conventions & Recipes

Code patterns, coding conventions, and common development recipes.

## TypeScript Conventions

- **Strict type checking** — explicit types for function parameters and returns
- **Zod** for runtime validation in API routes (`parseBody`, see below)
- **Shared API types** in `lib/types/api.ts` — derived from the DB schema, never redeclared in pages
- Prefer `const` over `let`
- Use `async/await` for asynchronous operations
- `'use client'` directive only for interactive React components

## API Route Pattern (Service-Based)

Routes validate with Zod, call a service, and funnel every failure through `handleApiError`
(`lib/api/errors.ts`). Services signal expected failures by throwing `ApiError` (`notFound`,
`badRequest`), which becomes the response status and `{ error }` body. Anything else is a 500 with
`{ error: 'Failed to <context>', details }` and never a stack trace.

```typescript
// app/api/styles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stylesService } from '@/lib/services'
import { handleApiError, notFound, parseBody } from '@/lib/api/errors'

const updateStyleSchema = z.object({ name: z.string().optional() })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await parseBody(request, updateStyleSchema) // 400 on invalid input
    const style = await stylesService.updateStyle(id, data)
    if (!style) throw notFound('Style') // 404
    return NextResponse.json({ style })
  } catch (error) {
    return handleApiError(error, 'update style')
  }
}
```

AI agent routes (`app/api/agents/*`) use `parseAgentBody` (adds the optional `aiConfig`) and
`buildAgentErrorResponse`, which reports model failures (e.g. a missing Ollama model) with a
remediation hint and passes `ApiError`s through unchanged. Image processing and AI calls live in
`lib/image-processing` and `lib/ai`, not in the route.

## Calling the API from the Client

Pages, components and hooks use the typed client in `lib/api-client.ts` instead of raw `fetch`.
Failures throw `ApiClientError` carrying the server's message and status.

```typescript
import { api, errorMessage } from '@/lib/api-client'
import type { ApiStyle } from '@/lib/types/api'

const [styles, setStyles] = useState<ApiStyle[]>([])

try {
  setStyles(await api.styles.list({ favoritesOnly: true }))
} catch (error) {
  toast.error(errorMessage(error, 'Failed to load styles'))
}
```

To add an endpoint, add a method to the matching resource in `api` and, if it returns a new
shape, a type to `lib/types/api.ts` (use `Serialized<SchemaType>`; JSON turns dates into strings).

## Service Layer Pattern

```typescript
import { stylesService, batchesService } from '@/lib/services'

// CRUD operations
const style = await stylesService.findById(styleId)
const allStyles = await stylesService.getLatestStyles()
const newStyle = await stylesService.createStyle({
  name: 'Cyberpunk Neon',
  palette: { primary: ['#FF00FF', '#00FFFF'] },
  renderingCues: { materials: ['Metal'] }
})

// Versioning
const v2 = await stylesService.createStyleVersion(parentId, { ... })
const versions = await stylesService.getStyleVersions(styleId)

// Transactions (automatic)
const batch = await batchesService.createBatch({
  name: 'My Batch',
  prompts: [{ promptText: 'A cyberpunk city' }]
})
```

## Anti-Pattern: Direct Database Access

```typescript
// ❌ NEVER do this in routes
import { db } from '@/lib/db'
const style = await db.query.styles.findFirst({ ... })

// ✅ ALWAYS use services
import { stylesService } from '@/lib/services'
const style = await stylesService.findById(styleId)
```

Direct DB access should only exist inside service implementations.

## React Component Pattern

```typescript
'use client'
import { useState } from 'react'

export function MyComponent({ prop }: { prop: string }) {
  const [state, setState] = useState(null)
  return (
    <div className="p-4">
      {/* content */}
    </div>
  )
}
```

- Server Components by default, `'use client'` only for interactivity
- Use shadcn/ui components from `components/ui/`
- Follow Tailwind CSS utility-first approach

## Styling

- Tailwind CSS utility classes
- shadcn/ui design system
- `cn()` utility from `lib/utils.ts` for conditional classes:

```typescript
import { cn } from '@/lib/utils'
const className = cn(
  'base-classes',
  condition && 'conditional-classes'
)
```

## Inngest Function Pattern

```typescript
import { inngest } from '@/lib/queue/client'

export const executeBatch = inngest.createFunction(
  { id: 'batch-execute' },
  { event: 'batch/execute' },
  async ({ event, step }) => {
    const batch = await step.run('fetch-batch', async () => {
      return await db.query.batches.findFirst({
        where: eq(batches.id, event.data.batchId)
      })
    })
    for (const prompt of batch.prompts) {
      await step.run(`generate-${prompt.id}`, async () => {
        // Generate image
      })
    }
  }
)
```

## Common Development Recipes

### Creating an Image Batch

1. POST to `/api/batches` with `{ name, provider, prompts, defaults? }`
2. POST to `/api/batches/[id]/execute` to start generation
3. Monitor via Inngest dashboard or UI

### Creating an Audio Batch

1. POST to `/api/audio-batches` with `{ name, provider, prompts, defaults? }`
2. POST to `/api/audio-batches/[id]/execute` to start generation

### Adding a New Style Version

1. POST to `/api/styles` with `parentStyleId` in body
2. System auto-increments version number

### Creating a Subject or Guidance

1. Use AI agent: POST to `/api/agents/create-subject` with `{ concept }`
2. Save: POST to `/api/subjects` with generated data

### Creating a Prompt with AI

1. Select/create style, subject, and guidance
2. POST to `/api/prompts` with `{ styleId, subjectId, guidanceIds? }`
3. Server composes prompt text using AI agent

### Image Editing & Transformations

- Background removal: POST to `/api/images/[id]/transparent`
- Flipping: POST to `/api/images/[id]/flip`
- Squish animations: POST to `/api/squish-animations` with `{ imageId, intensity, animationType, generatedBy }`
- AI editing: POST to `/api/image-edits` with `{ imageId, sourceVersion, userPrompt }`

### Querying Images with Provenance

```typescript
import { imagesService } from '@/lib/services'
const images = await imagesService.getImagesByBatch(batchId)
const favorites = await imagesService.getImagesByBatch(batchId, { favoritesOnly: true })
const details = await imagesService.getImageWithDetails(imageId)
const stats = await imagesService.getImageStatistics(batchId)
```

### Using AI Agents

```typescript
const { promptText, promptId } = await api.agents.composePrompt({
  styleId: 'uuid',
  subjectId: 'uuid',
  guidanceIds: ['uuid1', 'uuid2'],
  aiConfig: toRequestConfig(), // from useAIModelSettings()
})
```

### Adding a New API Endpoint

1. Add service method in appropriate service (`lib/services/`)
2. Create route handler in `app/api/[resource]/route.ts`
3. Validate input with a Zod schema and `parseBody`
4. Call the service method; throw `notFound` / `badRequest` for expected failures
5. Return JSON and wrap the handler in `try/catch` → `handleApiError`
6. Add a method to `lib/api-client.ts` (and a type to `lib/types/api.ts` if needed)
7. Add tests

## File Naming

| Type       | Convention                              |
| ---------- | --------------------------------------- |
| Routes     | `app/api/[resource]/route.ts`           |
| Services   | `lib/services/[resource].service.ts`    |
| Components | PascalCase (`MyComponent.tsx`)          |
| Tests      | Colocated `*.test.ts` files             |
