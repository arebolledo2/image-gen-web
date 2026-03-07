# Image Gen Web — Documentation

## Quick Reference

| Item              | Value                                      |
| ----------------- | ------------------------------------------ |
| Framework         | Next.js 16 (App Router)                    |
| Language          | TypeScript (strict)                        |
| Database          | PostgreSQL + Drizzle ORM                   |
| AI Integration    | Vercel AI SDK 6 + Google Gemini + Ollama (local LLM, default model qwen3.5:9b-q8_0)           |
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
| [ai-agents.md](ai-agents.md)         | 10 AI agents with multi-provider support (Gemini/Ollama), model config, tools, chat agent (ToolLoopAgent)      | Creating or modifying AI agents and tools           |
[... 5 more lines ...]
```
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

```

## New Tests for Ollama Integration

### `lib/ai/__tests__/model.test.ts` - Model Factory Tests

Comprehensive tests for the provider-agnostic model factory:

| Test Section | Coverage |
|-------------|----------|
| `aiModelConfig` | Default configuration, environment variable overrides |
| `getChatModel` | Provider selection, custom model IDs, DevTools wrapper behavior |
| `getVisionModel` | Gemini-only vision tasks with override support |
| `checkOllamaConnection` | Connection testing for Ollama server health checks |
| Exported instances | `geminiFlash`, `gemini25Flash`, `gemini25FlashImage` |

### Test Coverage Summary

- **16 test cases** covering model factory functionality
- Environment variable configuration tests (`AI_MODEL_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_DEFAULT_MODEL`)
- Provider switching logic (Gemini vs Ollama)
- Connection testing for local LLM health checks
- Vision model separation (always Gemini)

### Existing Agent Tests

The existing test suite in `lib/ai/__tests__/agents.test.ts` continues to work with proper mocks for both providers:
- Style agents, prompt agents, batch metadata, editing, variations
- All tests mock the AI SDK's `generateText` function
- Default configuration targets Gemini but can be configured for Ollama at runtime


