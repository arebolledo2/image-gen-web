# Image Gen Web - AI Agent Instructions

A powerful web orchestration platform for large-scale AI image generation, built with Next.js 15, Vercel AI SDK, and Inngest.

## Quick Reference

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Vercel AI SDK & Google Gemini
- **Job Queue**: Inngest for background processing
- **Styling**: Tailwind CSS & shadcn/ui
- **Testing**: Vitest
- **Dev Server**: `npm run dev`
- **Database Sync**: `npm run db:push`
- **Test**: `npm run test`

## Project Overview

Image Gen Web is a sophisticated orchestration platform for managing AI-powered asset generation at scale. It supports both **image generation** and **audio/sound effect generation** with a unified workflow approach:

### Image Generation
- **Style Management**: Define and version complex art styles with AI-assisted crafting
- **Prompt Engineering**: Create reusable prompt templates with dynamic subject/style/guidance composition
- **Batch Orchestration**: Group prompts and styles into batches for bulk generation
- **Image Editing**: AI-powered editing, transformations (transparency, flipping), and squish animations
- **Gallery & Asset Tracking**: Organize generated images with full metadata and parent tracking

### Audio Generation
- **Audio Batch Management**: Create batches of sound effects with configurable parameters
- **AI-Assisted Prompt Creation**: Generate detailed audio prompts optimized for game SFX
- **Provider Support**: Multiple audio generation backends (AudioCraft, ElevenLabs)
- **Audio Gallery**: Browse, favorite, and manage generated sound effects

### AI Agents
Built-in AI agents for:
- Prompt composition and refinement
- Style generation and editing
- Subject and guidance creation
- Batch metadata generation
- Audio prompt creation

### Background Processing
Reliable execution using Inngest for queue management with retry logic and status tracking.

Whether generating game assets, marketing materials, or experimental art, this platform provides tools to generate at scale with precision.

## Architecture

### Tech Stack

```
Next.js 15 (App Router)
├── PostgreSQL (Drizzle ORM)
├── Vercel AI SDK (Google Gemini)
├── Inngest (Job Queue)
├── Tailwind CSS + shadcn/ui
└── Vitest (Testing)
```

### Key Patterns

**Database-First Approach**: All data persisted in PostgreSQL with Drizzle ORM. Schema defined in `lib/db/schema/`.

**Service Layer Architecture**: Business logic and database operations encapsulated in services (`lib/services/`):
- Transaction support for atomic multi-step operations
- Reusable business logic across API routes
- Versioning logic centralized in services
- Type-safe operations with full TypeScript inference
- Easier testing in isolation from HTTP layer

**Serverless-Ready Architecture**:
- Web UI: React interface for managing resources
- API Layer: Next.js Route Handlers using services for business logic
- Service Layer: Encapsulated database operations with transaction support
- Database: Relational schema tracking styles, prompts, batches, and images
- Queue System: Inngest handles asynchronous image generation

**AI Integration**: Vercel AI SDK with Google Gemini for:
- Prompt composition and refinement
- Style attribute generation
- Batch metadata creation
- Natural language understanding

### File Structure

```
app/
├── api/              # API routes (all resources)
├── batches/          # Image batch management UI
├── audio-batches/    # Audio batch management UI
├── editor/           # Image editing UI
├── gallery/          # Image gallery UI
├── audio-gallery/    # Audio gallery UI
├── guidance/         # Guidance modifiers UI
├── prompts/          # Prompt templates UI
├── styles/           # Style management UI
└── subjects/         # Subject definitions UI

components/
├── agents/           # AI agent components
├── batch/            # Batch-related components
├── editor/           # Image editing components
├── providers/        # React providers (theme, etc.)
├── shared/           # Shared UI components
└── ui/               # shadcn/ui components

lib/
├── ai/               # AI integration (agents.ts, image-generation.ts)
├── config/           # Configuration files
├── db/               # Database schema (schema.ts) and utilities
├── providers/        # Image generation providers
├── queue/            # Inngest job definitions (image & audio)
├── services/         # Service layer (business logic & transactions)
└── storage/          # Image/audio storage utilities
```

## Core Systems

### Service Layer

**Services** (defined in `lib/services/`):

**Image Services**:
- `stylesService`: Style CRUD with versioning support
- `subjectsService`: Subject management with versioning
- `guidanceService`: Guidance modifiers with versioning
- `promptsService`: Prompt composition with transactional guidance associations
- `batchesService`: Image batch operations with atomic transactions
- `imagesService`: Image and transformation operations

**Audio Services**:
- `audioBatchesService`: Audio batch CRUD with versioning
- `audioFilesService`: Audio file metadata and organization

**Base**:
- `baseService`: Shared transaction and query utilities

**Key Features**:
- **Transaction Support**: Multi-step operations are atomic (all-or-nothing)
- **Versioning Logic**: Automatic version tracking for styles, subjects, and guidance
- **Type Safety**: Full TypeScript inference from database schema
- **Reusability**: Business logic shared across API routes
- **Testability**: Services can be tested independently

**Example Usage**:
```typescript
import { batchesService } from '@/lib/services';

// Create batch with prompts atomically
const batch = await batchesService.createBatch({
  name: 'My Batch',
  prompts: [
    { promptText: 'A cyberpunk city' },
    { promptText: 'A neon samurai' }
  ]
});
// If any step fails, entire operation is rolled back

// Get batch with full details
const details = await batchesService.getBatchWithDetails(batch.id);
// Returns: batch + prompts + generations + images + lineage
```

### AI Agents

All AI agent functions are defined in `lib/ai/agents.ts` with corresponding API endpoints in `app/api/agents/`:

**Image Generation Agents**:
1. **Prompt Composition** (`composeConstructedPromptAgent`)
   - Combines style + subject + guidance into full prompt
   - API: `POST /api/agents/compose-prompt`

2. **Style Generation** (`createStyleAgent`)
   - Creates palette and rendering cues from description
   - API: `POST /api/agents/create-style`

3. **Style Editing** (`editStyleAgent`)
   - Modifies an existing style based on user request
   - API: `POST /api/agents/edit-style`

4. **Prompt Template Creation** (`createPromptAgent`)
   - Generates prompt templates from descriptions
   - API: `POST /api/agents/create-prompt`

5. **Prompt Adjustment** (`adjustPromptAgent`)
   - Refines existing prompts based on suggestions
   - API: `POST /api/agents/adjust-prompt`

6. **Prompt Variations** (`suggestPromptVariations`)
   - Generates variations of a base prompt
   - API: `POST /api/agents/suggest-variations`

7. **Subject Creation** (`createSubjectAgent`)
   - Expands simple concepts into detailed subjects
   - API: `POST /api/agents/create-subject`

**Batch Management Agents**:
8. **Batch Metadata** (`createBatchMetadataAgent`)
   - Generates batch names and descriptions
   - API: `POST /api/agents/create-batch-metadata`

**Audio Generation Agents**:
9. **Audio Prompt Creation** (`createAudioPromptAgent`)
   - Creates detailed audio prompts optimized for game SFX
   - API: `POST /api/agents/create-audio-prompt`

### Job Queue (Inngest)

**Job Functions** (defined in `lib/queue/`):

**Image Generation**:
- `batch-queue.ts` - Image batch execution with retry logic
- `functions.ts` - Individual image generation jobs with status tracking
- `types.ts` - Type definitions for image jobs

**Audio Generation**:
- `audio-batch-queue.ts` - Audio batch execution with retry logic
- `audio-functions.ts` - Individual audio generation jobs
- `audio-types.ts` - Type definitions for audio jobs

**Provider Support**:
- Image: Gemini (2.0 & 3.0), ComfyUI
- Audio: AudioCraft, ElevenLabs

**Development**: Inngest dev server runs with `npm run dev`

### API Routes

RESTful API in `app/api/`:

**Image Generation**:
- `/api/styles` - Style CRUD operations
- `/api/subjects` - Subject definitions
- `/api/guidance` - Guidance modifiers
- `/api/prompts` - Prompt template management
- `/api/batches` - Image batch management and execution
- `/api/images` - Image metadata and operations
- `/api/squish-animations` - Squish animation generation
- `/api/image-edits` - AI-powered image editing

**Audio Generation**:
- `/api/audio-batches` - Audio batch management and execution
- `/api/audio` - Audio file metadata access

**AI Agents**:
- `/api/agents/*` - AI agent endpoints (9 total)

**Providers**:
- `/api/providers` - Image generation provider info

See `API.md` for detailed API documentation.

## Task-Based File Guide

### Modifying Database Schema
| What | Files |
|------|-------|
| Table definitions | `lib/db/schema.ts` |
| Database utilities | `lib/db/index.ts` |
| Migrations | `drizzle/migrations/` (auto-generated) |
| Apply schema | `npm run db:push` |

### Modifying Business Logic (Services)
| What | Files |
|------|-------|
| Style operations | `lib/services/styles.service.ts` |
| Subject operations | `lib/services/subjects.service.ts` |
| Guidance operations | `lib/services/guidance.service.ts` |
| Prompt operations | `lib/services/prompts.service.ts` |
| Image batch operations | `lib/services/batches.service.ts` |
| Image operations | `lib/services/images.service.ts` |
| Audio batch operations | `lib/services/audio-batches.service.ts` |
| Audio file operations | `lib/services/audio-files.service.ts` |
| Base utilities | `lib/services/base.service.ts` |

### Modifying AI Agent Behavior
| What | Files |
|------|-------|
| All AI agent functions | `lib/ai/agents.ts` |
| Image generation utilities | `lib/ai/image-generation.ts` |
| AI agent API routes | `app/api/agents/*/route.ts` |

### Modifying Image Batch Processing
| What | Files |
|------|-------|
| Image batch queue | `lib/queue/batch-queue.ts` |
| Image generation functions | `lib/queue/functions.ts` |
| Image batch API routes | `app/api/batches/*/route.ts` |
| Image batch UI components | `components/batch/` |
| Image batch pages | `app/batches/` |

### Modifying Audio Batch Processing
| What | Files |
|------|-------|
| Audio batch queue | `lib/queue/audio-batch-queue.ts` |
| Audio generation functions | `lib/queue/audio-functions.ts` |
| Audio batch API routes | `app/api/audio-batches/*/route.ts` |
| Audio batch pages | `app/audio-batches/` |
| Audio gallery page | `app/audio-gallery/page.tsx` |

### Modifying Style Management
| What | Files |
|------|-------|
| Style API routes | `app/api/styles/*/route.ts` |
| Style pages | `app/styles/` |
| Style versioning logic | `lib/services/styles.service.ts` |

### Modifying Prompts & Templates
| What | Files |
|------|-------|
| Prompt API routes | `app/api/prompts/*.ts` |
| Prompt UI components | `components/prompts/` |
| Prompt pages | `app/prompts/` |

### Modifying Image Editing & Transformations
| What | Files |
|------|-------|
| Image editing API | `app/api/images/*/route.ts` |
| Squish animation API | `app/api/squish-animations/*/route.ts` |
| Image edit API | `app/api/image-edits/*/route.ts` |
| Editor UI components | `components/editor/` |
| Editor page | `app/editor/` |

### Adding New API Endpoints
| What | Files |
|------|-------|
| Route handler | `app/api/[resource]/route.ts` |
| Business logic | Add methods to appropriate service in `lib/services/` |
| Database queries | Inside service methods only |
| Validation | Zod schemas (future: `lib/validation/`) |

### Adding Tests
| What | Files |
|------|-------|
| Unit tests | `*.test.ts` files throughout codebase |
| Test utilities | `vitest.setup.ts`, `vitest.config.ts` |
| Run tests | `npm run test` |

## Development Workflow

### Running the Application

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with DATABASE_URL and GEMINI_API_KEY

# Initialize database
npm run db:push

# Run development server (Next.js + Inngest)
npm run dev
```

The dev server starts both Next.js and Inngest concurrently.

### Database Operations

```bash
# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio

# Generate migrations (if needed)
npm run db:generate
```

**Important**: Always run `npm run db:push` after modifying schema files.

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

**Testing Framework**: Vitest with TypeScript support.

### Building for Production

```bash
# Build application
npm run build

# Start production server
npm start
```

## Code Patterns & Conventions

### TypeScript Conventions

- Use strict type checking
- Explicit types for function parameters and returns
- Use Zod for runtime validation in API routes
- Prefer `const` over `let`
- Use `async/await` for asynchronous operations

### API Route Pattern

**Current Pattern (Using Services)**:
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
    // Validate required fields
    if (!body.name || !body.palette || !body.renderingCues) {
      return NextResponse.json(
        { error: 'Name, palette, and renderingCues are required' },
        { status: 400 }
      )
    }

    // Use service for business logic (handles versioning, transactions)
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

**Benefits**:
- Services handle transaction logic automatically
- Versioning logic centralized in services
- Business rules enforced consistently
- Easier to test routes (mock services instead of DB)

### Service Layer Pattern (Recommended)

**Use services for all database operations**:
```typescript
import { stylesService, batchesService } from '@/lib/services'

// CRUD operations
const style = await stylesService.findById(styleId)
const allStyles = await stylesService.getLatestStyles()
const newStyle = await stylesService.createStyle({
  name: 'Cyberpunk Neon',
  palette: { primary: ['#FF00FF', '#00FFFF'], ... },
  renderingCues: { materials: ['Metal'], ... }
})

// Versioning
const v2 = await stylesService.createStyleVersion(parentId, { ... })
const versions = await stylesService.getStyleVersions(styleId)

// Transactions (automatic)
const batch = await batchesService.createBatch({
  name: 'My Batch',
  prompts: [
    { promptText: 'A cyberpunk city' },
    { promptText: 'A neon samurai' }
  ]
})
// All inserts are wrapped in a transaction automatically

// Complex queries
const details = await batchesService.getBatchWithDetails(batchId)
// Returns: batch + prompts + generations + images + lineage
```

### Direct Database Pattern (Legacy - Avoid)

**Only use direct DB access in services, not in routes**:
```typescript
import { db } from '@/lib/db'
import { styles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// This pattern should only be used INSIDE service methods
const style = await db.query.styles.findFirst({
  where: eq(styles.id, styleId)
})
```

### Inngest Function Pattern

```typescript
// lib/queue/batch-execution.ts
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

    // Process each prompt
    for (const prompt of batch.prompts) {
      await step.run(`generate-${prompt.id}`, async () => {
        // Generate image
      })
    }
  }
)
```

### React Component Pattern

```typescript
// components/shared/my-component.tsx
'use client'

import { useState } from 'react'

export function MyComponent({ prop }: { prop: string }) {
  const [state, setState] = useState(null)

  return (
    <div className="p-4">
      {/* JSX content */}
    </div>
  )
}
```

- Use `'use client'` directive for interactive components
- Use shadcn/ui components from `components/ui/`
- Follow Tailwind CSS utility-first approach
- Use TypeScript for all props

### Environment Variables

Required in `.env.local`:
```bash
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="your_api_key"
INNGEST_EVENT_KEY="your_inngest_key"
INNGEST_SIGNING_KEY="your_signing_key"
```

### Styling Conventions

- Use Tailwind CSS utility classes
- Follow shadcn/ui design system
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Maintain consistent spacing and colors

```typescript
import { cn } from '@/lib/utils'

const className = cn(
  'base-classes',
  condition && 'conditional-classes',
  'additional-classes'
)
```

## Key Files Reference

- `README.md` - Project overview and getting started
- `API.md` - Detailed API documentation
- `SETUP_GUIDE.md` - Comprehensive setup instructions
- `lib/services/README.md` - Service layer documentation
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `drizzle.config.ts` - Database configuration
- `tsconfig.json` - TypeScript configuration

## Common Tasks

### Creating an Image Batch

1. POST to `/api/batches` with:
   - `name`: Batch name
   - `provider`: `gemini`, `gemini3`, or `comfyui`
   - `prompts`: Array of prompt objects with `promptText`
   - `defaults`: Optional batch-level settings (aspectRatio, resolution, count)
2. POST to `/api/batches/[id]/execute` to start generation
3. Monitor progress via UI or database

### Creating an Audio Batch

1. POST to `/api/audio-batches` with:
   - `name`: Batch name
   - `provider`: `audiocraft` or `elevenlabs`
   - `prompts`: Array of audio prompt text strings
   - `defaults`: Optional settings (duration, count, temperature, topK, cfgCoef)
2. POST to `/api/audio-batches/[id]/execute` to start generation
3. Monitor progress via audio gallery UI

### Adding a New Style Version

1. Call `/api/styles` POST with `parentStyleId`
2. System auto-increments version number
3. Parent style remains accessible for history

### Creating a Subject or Guidance

1. Use AI agent to expand concept:
   - POST to `/api/agents/create-subject` with `concept`
2. Save to database:
   - POST to `/api/subjects` with generated name and description
3. Use in prompts via `subjectId`

### Creating a Prompt with AI Composition

1. Select or create style, subject, and guidance
2. POST to `/api/prompts` with:
   - `styleId`: UUID of style
   - `subjectId`: UUID of subject
   - `guidanceIds`: Array of guidance UUIDs (optional)
3. Server composes prompt using AI agent
4. Cached `promptText` stored in database

### Image Editing & Transformations

**Background Removal**:
- POST to `/api/images/[id]/transparent` to generate transparent version
- Removes magenta (#FF00FF) background automatically

**Flipping**:
- POST to `/api/images/[id]/flip` to create horizontally flipped version

**Squish Animations**:
- POST to `/api/squish-animations` with:
  - `imageId`: Source image UUID
  - `intensity`: 0-100 bounce/squash intensity
  - `animationType`: `bounce` or `squash_stretch`
  - `generatedBy`: `manual` or `ai`

**AI Editing**:
- POST to `/api/image-edits` with:
  - `imageId`: Source image UUID
  - `sourceVersion`: Which version to edit (original, transparent, etc.)
  - `userPrompt`: Edit instructions (e.g., "add flames")

### Using AI Agents

```typescript
// Compose prompt from style + subject
const response = await fetch('/api/agents/compose-prompt', {
  method: 'POST',
  body: JSON.stringify({
    styleId: 'uuid',
    subjectId: 'uuid',
    guidanceIds: ['uuid1', 'uuid2'] // optional
  })
})

const { promptText } = await response.json()
```

### Querying Images with Provenance

```typescript
import { imagesService } from '@/lib/services'

// Get all images from a specific batch
const images = await imagesService.getImagesByBatch(batchId)

// Get only favorite images
const favorites = await imagesService.getImagesByBatch(batchId, {
  favoritesOnly: true
})

// Get image with full details
const imageDetails = await imagesService.getImageWithDetails(imageId)
// Returns: image + generation + batch + transformations + edits

// Get batch statistics
const stats = await imagesService.getImageStatistics(batchId)
// Returns: { total, favorites, withTransparent, withFlipped, withAnimations, withEdits }
```

## Notes

- This project uses App Router (not Pages Router)
- Server Components by default, `'use client'` for interactivity
- **Always use services for database operations** - Never access `db` directly in routes
- Services provide transaction support for multi-step operations
- All async operations use standard `async/await`
- Inngest handles all background processing reliably
- **Dual-purpose platform**: Supports both image and audio generation workflows
- **Image features**: Transparency removal, flipping, squish animations, AI editing
- **Audio features**: Game SFX generation with multiple providers and parameter control
- Image storage configuration may vary based on deployment environment
