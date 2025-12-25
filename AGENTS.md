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

Image Gen Web is a sophisticated interface for managing the entire lifecycle of AI image generation. It goes beyond simple single-image prompts by offering a structured approach to:

- **Style Management**: Define and version complex art styles with AI-assisted crafting
- **Prompt Engineering**: Create reusable prompt templates with dynamic variables
- **Batch Orchestration**: Group prompts and styles into batches for bulk generation
- **AI Agents**: Built-in agents for prompt composition, style generation, and metadata creation
- **Background Processing**: Reliable execution using Inngest for queue management
- **Gallery & Asset Tracking**: Organize generated images with full metadata and parent tracking

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

**Serverless-Ready Architecture**:
- Web UI: React interface for managing resources
- API Layer: Next.js Route Handlers for database operations and background jobs
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
├── api/              # API routes (styles, batches, prompts, etc.)
├── batches/          # Batch management UI
├── editor/           # Image editing UI
├── gallery/          # Image gallery UI
├── guidance/         # Guidance modifiers UI
├── prompts/          # Prompt templates UI
└── subjects/         # Subject definitions UI

components/
├── agents/           # AI agent components
├── batch/            # Batch-related components
├── editor/           # Image editing components
├── providers/        # React providers (theme, etc.)
├── shared/           # Shared UI components
└── ui/               # shadcn/ui components

lib/
├── ai/               # AI integration (Gemini, prompt composition)
├── config/           # Configuration files
├── db/               # Database schema and utilities
├── providers/        # Database providers
├── queue/            # Inngest job definitions
└── storage/          # Image storage utilities
```

## Core Systems

### Database Schema

**Key Tables** (defined in `lib/db/schema/`):
- `styles`: Art style definitions with versioning support
- `prompts`: Reusable prompt templates with variables
- `subjects`: Common subjects (characters, objects)
- `guidance`: Instructional modifiers (lighting, composition)
- `batches`: Generation batches grouping prompts and styles
- `batch_prompts`: Junction table linking batches to prompts
- `images`: Generated images with metadata and parent tracking

**Relationships**:
- Styles can be versioned via `parent_style_id`
- Batches contain multiple prompts via `batch_prompts`
- Images track parent batch and prompt for provenance

### AI Agents

Four primary agent functions (in `lib/ai/`):

1. **Prompt Composition** (`composePrompt`)
   - Combines style + subject + guidance into full prompt
   - API: `POST /api/agents/compose-prompt`

2. **Style Generation** (`generateStyle`)
   - Creates palette and rendering cues from description
   - API: `POST /api/agents/create-style`

3. **Style Editing** (`editStyle`)
   - Modifies an existing style based on a user request
   - API: `POST /api/agents/edit-style`

4. **Prompt Template Creation** (`createPrompt`)
   - Generates prompt templates from descriptions
   - API: `POST /api/agents/create-prompt`

### Job Queue (Inngest)

**Job Functions** (defined in `lib/queue/`):
- Batch execution with retry logic
- Image generation with status tracking
- Provider support: Gemini, ComfyUI

**Development**: Inngest dev server runs with `npm run dev`

### API Routes

RESTful API in `app/api/`:
- `/api/styles` - Style CRUD operations
- `/api/batches` - Batch management and execution
- `/api/prompts` - Prompt template management
- `/api/subjects` - Subject definitions
- `/api/guidance` - Guidance modifiers
- `/api/images` - Image metadata access
- `/api/agents/*` - AI agent endpoints

See `API.md` for detailed API documentation.

## Task-Based File Guide

### Modifying Database Schema
| What | Files |
|------|-------|
| Table definitions | `lib/db/schema/*.ts` |
| Database utilities | `lib/db/` |
| Migrations | `drizzle/migrations/` (auto-generated) |
| Apply schema | `npm run db:push` |

### Modifying AI Agent Behavior
| What | Files |
|------|-------|
| Prompt composition logic | `lib/ai/compose-prompt.ts` |
| Style generation logic | `lib/ai/generate-style.ts` |
| Prompt template creation | `lib/ai/create-prompt.ts` |
| AI agent API routes | `app/api/agents/*.ts` |

### Modifying Batch Processing
| What | Files |
|------|-------|
| Batch job definitions | `lib/queue/batch-execution.ts` |
| Batch API routes | `app/api/batches/*.ts` |
| Batch UI components | `components/batch/` |
| Batch pages | `app/batches/` |

### Modifying Style Management
| What | Files |
|------|-------|
| Style API routes | `app/api/styles/*.ts` |
| Style UI components | `components/styles/` |
| Style versioning logic | API route handlers |

### Modifying Prompts & Templates
| What | Files |
|------|-------|
| Prompt API routes | `app/api/prompts/*.ts` |
| Prompt UI components | `components/prompts/` |
| Prompt pages | `app/prompts/` |

### Modifying UI Components
| What | Files |
|------|-------|
| Shared components | `components/shared/` |
| shadcn/ui components | `components/ui/` |
| Agent components | `components/agents/` |
| Page layouts | `app/layout.tsx`, `app/*/page.tsx` |

### Adding New API Endpoints
| What | Files |
|------|-------|
| Route handler | `app/api/[resource]/route.ts` |
| Database queries | `lib/db/` |
| Validation | Zod schemas in route handlers |

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

```typescript
// app/api/styles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const styles = await db.query.styles.findMany()
    return NextResponse.json({ styles })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Validate and process
  const style = await db.insert(styles).values(body)
  return NextResponse.json({ style }, { status: 201 })
}
```

### Database Query Pattern

```typescript
import { db } from '@/lib/db'
import { styles, prompts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Query
const style = await db.query.styles.findFirst({
  where: eq(styles.id, styleId)
})

// Insert
const newStyle = await db.insert(styles).values({
  name: 'Cyberpunk Neon',
  palette: ['#FF00FF', '#00FFFF'],
  renderingCues: ['High contrast', 'Film grain']
})

// Update
await db.update(styles)
  .set({ version: existingStyle.version + 1 })
  .where(eq(styles.id, styleId))
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
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration
- `drizzle.config.ts` - Database configuration
- `tsconfig.json` - TypeScript configuration

## Common Tasks

### Adding a New Style Version

1. Call `/api/styles` POST with `parentStyleId`
2. System auto-increments version number
3. Parent style remains accessible for history

### Creating a Batch

1. POST to `/api/batches` with:
   - `name`: Batch name
   - `provider`: `gemini` or `comfyui`
   - `prompts`: Array of prompt objects
2. POST to `/api/batches/[id]/execute` to start generation
3. Monitor progress via UI or database

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
// Get all images from a specific batch
const images = await db.query.images.findMany({
  where: eq(images.batchId, batchId),
  with: {
    batch: true,
    prompt: true
  }
})
```

## Notes

- This project uses App Router (not Pages Router)
- Server Components by default, `'use client'` for interactivity
- Database operations should use Drizzle ORM
- All async operations use standard `async/await`
- Inngest handles all background processing reliably
- Image storage configuration may vary based on deployment environment
