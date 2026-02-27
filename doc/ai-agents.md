# AI Agent System

## Overview

The image-gen-web platform uses **Vercel AI SDK 6** with **Google Gemini** to power AI agents for prompt composition, style generation, batch metadata, and more. A `ToolLoopAgent` provides autonomous multi-step workflows via chat.

- Agent functions: modular files under `lib/ai/agents/`
- Agent tools: `lib/ai/tools/`
- Model configuration: `lib/ai/model.ts`

## Model Configuration (`lib/ai/model.ts`)

| Export | Description |
|--------|-------------|
| `getModel(modelId?)` | Factory wrapping Google AI models with DevTools middleware (dev only). Default: `gemini-3.1-flash-preview` |
| `geminiFlash` | `gemini-3.1-flash-preview` instance |
| `gemini25Flash` | `gemini-2.5-flash` instance |
| `gemini25FlashImage` | `gemini-2.5-flash-image-preview` instance |

## Agent Functions (10 total)

All defined in `lib/ai/agents/` with modular files.

### Style Agents (`agents/style-agents.ts`)

1. **`createStyleAgent`** — Creates palette and rendering cues from description. Exports `StyleSuggestion`, `styleSchema`.
   - API: `POST /api/agents/create-style`
2. **`editStyleAgent`** — Modifies an existing style based on user request. Exports `EditStyleParams`.
   - API: `POST /api/agents/edit-style`

### Prompt Agents (`agents/prompt-agents.ts`)

3. **`composeConstructedPromptAgent`** — Combines style + subject + guidance into a full prompt. Exports `ComposePromptParams`.
   - API: `POST /api/agents/compose-prompt`
4. **`createPromptAgent`** — Generates prompt templates from descriptions. Exports `PromptSuggestion`, `CreatePromptAgentParams`.
   - API: `POST /api/agents/create-prompt`
5. **`adjustPromptAgent`** — Refines existing prompts based on suggestions.
   - API: `POST /api/agents/adjust-prompt`
6. **`suggestPromptVariations`** — Generates variations of a base prompt.
   - API: `POST /api/agents/suggest-variations`

### Subject Agents (`agents/subject-agents.ts`)

7. **`createSubjectAgent`** — Expands simple concepts into detailed subjects. Exports `SubjectSuggestion`.
   - API: `POST /api/agents/create-subject`

### Batch Agents (`agents/batch-agents.ts`)

8. **`createBatchMetadataAgent`** — Generates batch names and descriptions. Exports `BatchMetadataSuggestion`.
   - API: `POST /api/agents/create-batch-metadata`

### Audio Agents (`agents/audio-agents.ts`)

9. **`createAudioPromptAgent`** — Creates detailed audio prompts optimized for game SFX. Exports `AudioPromptSuggestion`.
   - API: `POST /api/agents/create-audio-prompt`

### Chat Agent (`lib/agent.ts`)

10. **Game Asset Workflow Agent** (`imageAgent`) — `ToolLoopAgent` using Vercel AI SDK 6
    - Endpoint: `POST /api/chat` (maxDuration: 30s)
    - Uses `createAgentUIStreamResponse` for streaming
    - 14 tools total (5 inline + 9 imported)

## Agent Tools (`lib/ai/tools/`)

Tools wired into the `imageAgent` ToolLoopAgent.

### Inline tools (defined in `lib/agent.ts`)

- `getRecentBatches` — Query recent batch data
- `getBatchDetails` — Get full batch details
- `getStyleDetails` — Get style details
- `getSubjectDetails` — Get subject details
- `analyzeImage` — Vision-based image analysis (uses `gemini25Flash`)

### Imported tools (from `lib/ai/tools/`)

| Module | Tools |
|--------|-------|
| `style-tools.ts` | `getAllStyles`, `createStyle` |
| `subject-tools.ts` | `getAllSubjects`, `createSubject` |
| `batch-tools.ts` | `createBatch`, `executeBatch` |
| `image-tools.ts` | `getImages` |
| `prompt-tools.ts` | `createPromptWithAI`, `adjustPrompt` |

## Barrel Exports

- `lib/ai/agents/index.ts` — Re-exports all agent functions and types from modular files
- `lib/ai/tools/index.ts` — Re-exports all tools
- `lib/ai/agents.ts` — Legacy barrel that re-exports from `agents/` (backwards compatibility)

## Usage Examples

### Agent API call

```typescript
// Compose prompt from style + subject
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

### Chat agent (from UI)

```typescript
// The chat agent is wired through the Vercel AI SDK UI
// POST /api/chat with { messages }
// Streams responses with tool calls
```

## File Structure

```
lib/ai/
├── agents.ts               # Legacy barrel export
├── agents/                  # Modular agent definitions
│   ├── index.ts             # Barrel export
│   ├── style-agents.ts
│   ├── prompt-agents.ts
│   ├── batch-agents.ts
│   ├── subject-agents.ts
│   └── audio-agents.ts
├── tools/                   # Chat agent tools
│   ├── index.ts             # Barrel export
│   ├── batch-tools.ts
│   ├── image-tools.ts
│   ├── prompt-tools.ts
│   ├── style-tools.ts
│   └── subject-tools.ts
├── model.ts                 # AI model factory
└── image-generation.ts      # Image generation utilities

lib/agent.ts                 # ToolLoopAgent definition (imageAgent)
```
