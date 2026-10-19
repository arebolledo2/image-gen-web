# Image Gen Web — System Architecture

## Tech Stack

```
Next.js 16 (App Router)
├── PostgreSQL (Drizzle ORM)
├── Vercel AI SDK 7 (Google Gemini)
├── Inngest (Job Queue)
├── Tailwind CSS + shadcn/ui
└── Vitest (Testing)
```

## Key Architectural Patterns

### Database-First Approach

All data is persisted in PostgreSQL with Drizzle ORM. The schema — 17 tables, 6 enums, and full relations — is defined in `lib/db/schema.ts` as the single source of truth.

### Service Layer Architecture

Business logic and database operations are encapsulated in services (`lib/services/`):

- **Transaction support** for atomic multi-step operations
- **Reusable business logic** across API routes
- **Versioning logic** centralized in services
- **Type-safe operations** with full TypeScript inference
- **Isolation from HTTP layer** for easier testing

### Serverless-Ready Architecture

Each layer has a single responsibility and communicates only with its immediate neighbors:

- **Web UI** — React interface for managing resources
- **API Layer** — Next.js Route Handlers delegating to services
- **Service Layer** — Encapsulated database operations with transaction support
- **Database** — Relational schema tracking styles, prompts, batches, and images
- **Queue System** — Inngest handles asynchronous image/audio generation

### AI Integration

Vercel AI SDK with Google Gemini powers:

- Prompt composition and refinement
- Style attribute generation
- Batch metadata creation
- Natural language understanding
- Autonomous multi-step agent (`ToolLoopAgent`) for game asset workflows

### Provider Pattern

Pluggable providers for both image generation (Gemini, Gemini3, ComfyUI) and audio generation (AudioCraft, ElevenLabs) via factory functions in `lib/providers/`.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Web UI (React)                     │
│         batches/ · gallery/ · styles/ · editor/         │
└────────────────────────┬────────────────────────────────┘
                         │ fetch / server actions
┌────────────────────────▼────────────────────────────────┐
│                  API Routes (app/api/)                   │
│        19 route groups · validates input · JSON out      │
└──┬──────────────┬──────────────┬───────────────────┬────┘
   │              │              │                   │
   ▼              ▼              ▼                   ▼
┌──────┐   ┌───────────┐   ┌─────────┐   ┌───────────────┐
│  AI  │   │  Services  │   │  Queue  │   │    Storage    │
│ SDK  │   │ (lib/svc/) │   │(Inngest)│   │ (local files) │
└──┬───┘   └─────┬─────┘   └────┬────┘   └───────────────┘
   │             │               │
   │      ┌──────▼──────┐       │
   │      │  PostgreSQL  │◄──────┘
   │      │ (Drizzle ORM)│
   └──────┴─────────────┘
```

## File Structure

```
app/
├── api/                    # REST API routes (19 route groups)
│   ├── agents/             # AI agent endpoints (9)
│   ├── audio/              # Audio file access
│   ├── audio-batch-prompts/# Audio prompt editing
│   ├── audio-batches/      # Audio batch CRUD + execution
│   ├── batch-prompts/      # Image prompt editing
│   ├── batches/            # Image batch CRUD + execution
│   ├── chat/               # Chat agent endpoint (ToolLoopAgent)
│   ├── export/             # Batch export (ZIP, image listing)
│   ├── guidance/           # Guidance modifier CRUD
│   ├── image-edits/        # AI-powered image editing
│   ├── images/             # Image metadata + transformations
│   ├── inngest/            # Inngest webhook (serve endpoint)
│   ├── prompts/            # Prompt template CRUD
│   ├── providers/          # Provider info
│   ├── squish-animations/  # Squish animation generation
│   ├── styles/             # Style CRUD
│   ├── subject-categories/ # Subject category CRUD
│   └── subjects/           # Subject CRUD
├── batches/                # Image batch management UI
├── audio-batches/          # Audio batch management UI
├── editor/                 # Image editing UI
├── gallery/                # Image gallery UI
├── audio-gallery/          # Audio gallery UI
├── guidance/               # Guidance modifiers UI
├── prompts/                # Prompt templates UI
├── styles/                 # Style management UI
└── subjects/               # Subject definitions UI

components/
├── agents/                 # AI agent UI components
├── ai-elements/            # AI chat interface components
├── batch/                  # Batch management components
├── chat/                   # Chat UI components
├── editor/                 # Image editing components
├── providers/              # React providers (theme)
├── shared/                 # Shared UI components
├── styles/                 # Style management components
├── ui/                     # shadcn/ui base components
└── [standalone files]      # navigation, theme-toggle, etc.

lib/
├── ai/
│   ├── agents.ts           # Legacy barrel (re-exports from agents/)
│   ├── agents/             # Modular agent definitions
│   │   ├── style-agents.ts
│   │   ├── prompt-agents.ts
│   │   ├── batch-agents.ts
│   │   ├── subject-agents.ts
│   │   └── audio-agents.ts
│   ├── tools/              # Agent tools for chat ToolLoopAgent
│   │   ├── batch-tools.ts
│   │   ├── image-tools.ts
│   │   ├── prompt-tools.ts
│   │   ├── style-tools.ts
│   │   └── subject-tools.ts
│   ├── model.ts            # AI model factory (Gemini 3.1 Flash, 2.5 Flash)
│   └── image-generation.ts # Image generation utilities
├── db/
│   ├── schema.ts           # All 17 tables, 6 enums, relations
│   └── index.ts            # Database connection
├── providers/
│   ├── types.ts            # ImageProvider interface
│   ├── factory.ts          # Provider factory
│   ├── gemini/             # Gemini (original) provider
│   ├── gemini3/            # Gemini 3 provider
│   ├── comfyui/            # ComfyUI local provider
│   └── audio/              # Audio providers (AudioCraft, ElevenLabs)
├── queue/
│   ├── client.ts           # Inngest client setup
│   ├── config.ts           # Queue config (retries, TTL)
│   ├── batch-queue.ts      # Image batch execution
│   ├── functions.ts        # Image generation jobs
│   ├── audio-batch-queue.ts # Audio batch execution
│   └── audio-functions.ts  # Audio generation jobs
├── services/
│   ├── base.service.ts     # Shared transaction utilities
│   ├── styles.service.ts
│   ├── subjects.service.ts
│   ├── subject-categories.service.ts
│   ├── guidance.service.ts
│   ├── prompts.service.ts
│   ├── batches.service.ts
│   ├── batch-execution.service.ts
│   ├── images.service.ts
│   ├── audio-batches.service.ts
│   └── audio-files.service.ts
└── storage/
    ├── local-storage.ts    # File I/O for images
    ├── thumbnail.ts        # Thumbnail generation (Jimp)
    └── zip-export.ts       # ZIP archive creation (JSZip)
```

## Cross-Cutting Concerns

| Concern | Implementation |
|---------|---------------|
| **Versioning** | Styles, subjects, guidance, and batches support parent-based versioning via self-referencing `parentId` chains |
| **Transactions** | Services handle multi-step operations atomically via `db.transaction()` |
| **Error Handling** | API routes catch errors and return JSON with appropriate HTTP status codes |
| **Signal Flow** | UI → API route → service → database — layers are never skipped |
