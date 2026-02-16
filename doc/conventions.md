# Image Gen Web — Conventions & Recipes

Code patterns, coding conventions, and common development recipes.

## TypeScript Conventions

- **Strict type checking** — explicit types for function parameters and returns
- **Zod** for runtime validation in API routes
- Prefer `const` over `let`
- Use `async/await` for asynchronous operations
- `'use client'` directive only for interactive React components

## API Route Pattern (Service-Based)

```typescript
// app/api/styles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stylesService } from '@/lib/services'

export async function GET() {
  try {
    const styles = await stylesService.getLatestStyles()
    return NextResponse.json({ styles })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name || !body.palette || !body.renderingCues) {
      return NextResponse.json(
        { error: 'Name, palette, and renderingCues are required' },
        { status: 400 }
      )
    }

    const style = body.parentStyleId
      ? await stylesService.createStyleVersion(body.parentStyleId, body)
      : await stylesService.createStyle(body)

    return NextResponse.json({ style }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    )
  }
}
```

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
const response = await fetch('/api/agents/compose-prompt', {
  method: 'POST',
  body: JSON.stringify({
    styleId: 'uuid',
    subjectId: 'uuid',
    guidanceIds: ['uuid1', 'uuid2']
  })
})
const { promptText } = await response.json()
```

### Adding a New API Endpoint

1. Add service method in appropriate service (`lib/services/`)
2. Create route handler in `app/api/[resource]/route.ts`
3. Validate input
4. Call service method
5. Return JSON response
6. Add tests

## File Naming

| Type       | Convention                              |
| ---------- | --------------------------------------- |
| Routes     | `app/api/[resource]/route.ts`           |
| Services   | `lib/services/[resource].service.ts`    |
| Components | PascalCase (`MyComponent.tsx`)          |
| Tests      | Colocated `*.test.ts` files             |
