# Inngest Job Queue

## Overview

Inngest handles all background processing for image and audio generation. It provides reliable execution with retry logic and status tracking. The dev server starts alongside Next.js via `npm run dev` (which runs `npx inngest-cli@latest dev`). Jobs are triggered by API routes and tracked via database status fields.

## Inngest Client (`lib/queue/client.ts`)

- **Export:** `inngest` — An `Inngest` client instance
- **Config:** `id: 'image-gen-web'`, reads `INNGEST_EVENT_KEY` from env
- Dev mode enabled when `NODE_ENV === 'development'`

## Queue Configuration (`lib/queue/config.ts`)

- **Export:** `QUEUE_CONFIG` constant
- `queues.imageGeneration`: `'image-generation'`
- `jobOptions`:
  - `retryLimit: 3`
  - `retryDelay: 60` (seconds)
  - `retryBackoff: true` (exponential)
  - `expireInHours: 24`

## Webhook Endpoint (`app/api/inngest/route.ts`)

- **Methods:** `GET`, `POST`, `PUT` via `serve()`
- Registers two functions: `imageGenerationFunction` and `audioGenerationFunction`
- Single entry point Inngest uses to discover and invoke background jobs
- Not called directly by application code

## Image Generation Jobs

### Batch Queue (`lib/queue/batch-queue.ts`)

- Handles image batch execution with retry logic
- Triggered when POST `/api/batches/[id]/execute` is called
- Creates generation records for each prompt × count
- Dispatches individual generation jobs

### Generation Functions (`lib/queue/functions.ts`)

- Individual image generation jobs with status tracking
- Uses provider factory to get the right image provider (Gemini, Gemini3, ComfyUI)
- Updates generation status (pending → running → success/failed)
- Saves generated images to local storage

### Types (`lib/queue/types.ts`)

- Type definitions for image generation job events and data

## Audio Generation Jobs

### Audio Batch Queue (`lib/queue/audio-batch-queue.ts`)

- Handles audio batch execution with retry logic
- Same pattern as image batch queue

### Audio Functions (`lib/queue/audio-functions.ts`)

- Individual audio generation jobs
- Uses audio provider factory (AudioCraft/ElevenLabs)
- Tracks status and saves audio files

### Audio Types (`lib/queue/audio-types.ts`)

- Type definitions for audio generation job events and data

## Job Lifecycle

```
API Route (execute batch)
  → Inngest event dispatched
    → Batch queue function picks up
      → Creates generation records (pending)
        → For each generation:
          → Generation function runs
            → Status: running
            → Provider generates image/audio
            → File saved to storage
            → Status: success (or failed with retry)
      → Batch status updated (completed/failed)
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
        // Generate image via provider
      })
    }
  }
)
```

## Environment Variables

- `INNGEST_EVENT_KEY` — Inngest event key
- `INNGEST_SIGNING_KEY` — Inngest signing key

## File Structure

```
lib/queue/
├── client.ts              # Inngest client setup
├── config.ts              # Queue config (retries, TTL)
├── batch-queue.ts         # Image batch execution
├── functions.ts           # Image generation jobs
├── types.ts               # Image job types
├── audio-batch-queue.ts   # Audio batch execution
├── audio-functions.ts     # Audio generation jobs
├── audio-types.ts         # Audio job types
└── workers/               # (reserved for future use)
```
