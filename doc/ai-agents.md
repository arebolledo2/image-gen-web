# AI Agent System

## Overview

The image-gen-web platform uses **Vercel AI SDK 6** with configurable AI models for agentic workflows. The system now supports both **Google Gemini** (cloud) and **Ollama** (local) providers.

- Agent functions: modular files under `lib/ai/agents/`
- Agent tools: `lib/ai/tools/`
- Model configuration: `lib/ai/model.ts` - uses provider factory pattern
- Settings UI: `components/providers/ai-model-settings.tsx`

## AI Model Providers

### Environment Variables

The system supports two AI model providers, configured via environment variables or runtime settings.

```env
# Provider selection (default: "gemini")
AI_MODEL_PROVIDER=ollama  # or "gemini"

# Ollama configuration (when provider is ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen3.5:9b-q8_0
```

### Model Selection

The `lib/ai/model.ts` file implements a factory pattern for model selection:

| Export | Description | Default |
|--------|--|---------|
| `getChatModel(modelId?)` | Factory returning text chat model | provider-dependent |
| `geminiFlash` | `gemini-3.1-flash-preview` instance | Available |
| `gemini25Flash` | `gemini-2.5-flash` instance | Available |
| `checkOllamaConnection()` | Test if Ollama is available | Returns boolean |

### Provider-Specific Models

**Gemini (Google AI)**:
- Uses `@ai-sdk/google` provider
- Supports vision for image analysis (`gemini25FlashImage`)
- Requires API key configuration

**Ollama (Local)**:
- Uses `ollama-ai-provider-v2` package
- Default model: `qwen3.5:9b-q8_0`
- Local LLM inference via Ollama server

### Vision Model Separation

The chat agent uses text-only models for general interactions, but the `analyzeImage` tool always uses Gemini 25 Flash Image model since most local Ollama models don't support vision. This ensures image analysis functionality remains available regardless of the primary provider.

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
|--------|------|
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

### Switch to Ollama

```bash
# Set environment variable
AI_MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen3.5:9b-q8_0
```

Or use the UI settings modal (click the Settings button in the chat interface).

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
├── model.ts                 # AI model factory (provider-agnostic)
└── image-generation.ts      # Image generation utilities

lib/providers/types.ts       # Type definitions for providers

components/providers/
├── theme-provider.tsx       # Theme management
├── settings-provider.tsx    # Prompt style settings
├── ai-model-settings-provider.tsx  # AI provider configuration
└── ai-model-settings.tsx    # UI component for settings