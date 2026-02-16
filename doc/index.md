# Image Gen Web — Documentation

## Quick Reference

| Item              | Value                                      |
| ----------------- | ------------------------------------------ |
| Framework         | Next.js 16 (App Router)                    |
| Language          | TypeScript (strict)                        |
| Database          | PostgreSQL + Drizzle ORM                   |
| AI Integration    | Vercel AI SDK 6 + Google Gemini            |
| Job Queue         | Inngest                                    |
| Styling           | Tailwind CSS + shadcn/ui                   |
| Testing           | Vitest                                     |
| Dev server        | `npm run dev`                              |
| DB sync           | `npm run db:push`                          |
| Tests             | `npm run test`                             |

## Project Overview

Image Gen Web is a web orchestration platform for large-scale AI image and audio generation. It provides a complete workflow for designing art styles, composing prompts from reusable building blocks, executing generation batches across multiple providers, and managing the resulting assets through galleries and editors.

**Image generation** covers style management with versioning, prompt engineering (styles + subjects + guidance modifiers), batch orchestration with parallel job processing, an integrated image editor, and a gallery for browsing and tracking assets. **Audio generation** includes audio batch management, AI-assisted prompt creation, multi-provider support (AudioCraft, ElevenLabs), and a dedicated audio gallery.

The platform ships with **10 built-in AI agents** that assist with style creation, prompt composition, subject generation, batch metadata, and more. All generation work is processed asynchronously through **Inngest** background jobs with retry and concurrency controls.

## Documentation Index

| Document                              | Description                                                        | When to use                                        |
| ------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| [architecture.md](architecture.md)    | System architecture, tech stack, key patterns, file structure      | Understanding overall design and code organization  |
| [database.md](database.md)            | Schema (15 tables, 6 enums), relations, type exports, migrations   | Modifying tables, adding columns, writing queries   |
| [services.md](services.md)            | Service layer (10 services), transactions, versioning, patterns    | Adding business logic, understanding data flow      |
| [ai-agents.md](ai-agents.md)         | 10 AI agents, model config, tools, chat agent (ToolLoopAgent)      | Creating or modifying AI agents and tools           |
| [api-reference.md](api-reference.md) | Complete REST API reference (18 route groups)                      | Adding or consuming API endpoints                   |
| [queue.md](queue.md)                  | Inngest job queue, image/audio generation jobs, retry config       | Working with background jobs or generation pipeline |
| [storage.md](storage.md)             | Image storage, thumbnails, ZIP export                              | File I/O, asset management, export features         |
| [providers.md](providers.md)         | Image providers (Gemini, Gemini3, ComfyUI), audio providers (AudioCraft, ElevenLabs) | Integrating or debugging generation providers |
| [development.md](development.md)     | Setup, environment, npm scripts, database ops, testing, building   | Getting started, running commands, CI/CD            |
| [conventions.md](conventions.md)     | Code patterns, TypeScript conventions, common development recipes  | Writing new code that follows project standards     |

## Key Directories

| Directory          | Contents                                             |
| ------------------ | ---------------------------------------------------- |
| `app/`             | Next.js App Router pages and API routes              |
| `app/api/`         | REST API endpoints                                   |
| `components/`      | React components (agents, batch, editor, chat, shared, ui) |
| `lib/`             | Core library code                                    |
| `lib/ai/`          | AI agents, tools, model configuration                |
| `lib/db/`          | Database schema and connection                       |
| `lib/providers/`   | Image and audio generation providers                 |
| `lib/queue/`       | Inngest job definitions                              |
| `lib/services/`    | Business logic layer                                 |
| `lib/storage/`     | File I/O, thumbnails, ZIP export                     |
