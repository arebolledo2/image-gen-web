# Providers

## Overview

Image-gen-web uses a pluggable provider pattern for both image and audio generation. Factory functions return the correct provider instance based on a type string, and each provider implements a standard interface.

- **Image providers**: OpenAI GPT Image 2 (default), OpenRouter GPT-5.4 Image 2, Gemini (original), Gemini 3, ComfyUI (zImage), ComfyUI (Krea)
- **Audio providers**: AudioCraft, ElevenLabs

All provider code lives in `lib/providers/`.

## Image Provider Interface (`lib/providers/types.ts`)

```typescript
interface ImageProvider {
  name: string
  testConnection(): Promise<boolean>
  generateImage(options: GenerationOptions): Promise<GenerationResult>
}

interface GenerationOptions {
  prompt: string
  batchId: string
  batchPromptId: string
  runNumber: number
  generationId: string
  parameters?: Record<string, unknown>
}
```

## Image Provider Factory (`lib/providers/factory.ts`)

`getProvider(name)` — Returns the provider instance for the given name:

| Name | Provider |
|------|----------|
| `'openai'` | `OpenAIProvider` |
| `'openrouter'` | `OpenRouterProvider` |
| `'gemini'` | `GeminiProvider` |
| `'gemini3'` | `Gemini3Provider` |
| `'comfyui'` | `ComfyUIProvider('txt2img')` (zImage workflow) |
| `'comfyui-krea'` | `ComfyUIProvider('txt2img_krea')` (Krea workflow) |

## Image Providers

**OpenAIProvider** (`lib/providers/openai/openai-provider.ts`)
- Default provider for new batches. Uses GPT Image 2 via the OpenAI Image API.
- Requires `OPENAI_API_KEY`.
- Model defaults to `gpt-image-2`; set `OPENAI_IMAGE_MODEL` to pin a snapshot such as `gpt-image-2-2026-04-21`.
- Batch resolutions are limited to OpenAI-supported sizes: `1024x1024`, `1024x1536`, `1536x1024`.

**OpenRouterProvider** (`lib/providers/openrouter/openrouter-provider.ts`)
- Uses OpenRouter Chat Completions image generation with model `openai/gpt-5.4-image-2` by default.
- Requires `OPENROUTER_API_KEY`; set `OPENROUTER_IMAGE_MODEL` to override the model.
- Sends `modalities: ["image", "text"]` plus `image_config` derived from the selected batch resolution.
- Parses base64 data URL images from `choices[*].message.images[*].image_url.url` and stores them through local image storage.

**GeminiProvider** (`lib/providers/gemini/gemini-provider.ts`)
- Uses the original Gemini image generation API. Provider type: `'gemini'`.

**Gemini3Provider** (`lib/providers/gemini3/gemini3-provider.ts`)
- Uses the newer Gemini 3 image generation API. Provider type: `'gemini3'`.

**ComfyUIProvider** (`lib/providers/comfyui/`)
- Local ComfyUI integration requiring ComfyUI running on `localhost:8188`.
- Provider types: `'comfyui'` (zImage workflow, `txt2img`) and `'comfyui-krea'` (Krea workflow, `txt2img_krea`) — both share the same `ComfyUIProvider` class, parameterized by workflow type via the constructor.
- Files: `comfyui-provider.ts`, `comfyui-client.ts` (HTTP client), `workflow-builder.ts` (workflow construction), `config.ts` (connection settings, `workflows`/`defaults` keyed by workflow type).
- Workflow templates live in `comfyui-templates/templates/` (`txt2img-zimage.template.json`, `txt2img-krea.template.json`) with matching parameter maps in `comfyui-templates/parameter-maps/`. The Krea workflow uses a two-stage `ClownsharKSampler_Beta` (RES4LYF) sampler chain instead of a single `KSampler`; its `seed` and `cfg` parameters fan out to both sampler nodes via a `nodeId` array in the parameter map (supported by `applyParametersToWorkflow`).

## Audio Provider Interface (`lib/providers/audio/types.ts`)

```typescript
interface AudioProvider {
  name: string
  testConnection(): Promise<boolean>
  generateAudio(options: AudioGenerationOptions, generationId: string): Promise<AudioGenerationResult>
}

interface AudioGenerationOptions {
  prompt: string
  duration?: number
  temperature?: number
  topK?: number
  cfgCoef?: number
  audioBatchId: string
}

type AudioProviderType = 'audiocraft' | 'elevenlabs'
```

## Audio Provider Factory (`lib/providers/audio/factory.ts`)

- `getAudioProvider(type?)` — Singleton factory. Returns `AudioCraftProvider` for both types — the Python service handles actual provider routing.
- `testAudioProvider(type?)` — Tests connection to the audio provider.

## Audio Providers

**AudioCraftProvider** (`lib/providers/audio/audiocraft-provider.ts`)
- HTTP client to the `audio-gen` Python Flask server at `http://localhost:5000`.
- Handles both AudioCraft and ElevenLabs routing server-side.

## Provider Selection

- **Image**: stored per-batch in `batches.provider` column (enum: `openai`, `openrouter`, `gemini`, `gemini3`, `comfyui`, `comfyui-krea`).
- **Audio**: stored per-batch in `audioBatches.provider` column (enum: `audiocraft`, `elevenlabs`).
- Provider is selected at batch creation time and cannot be changed after.

## File Structure

```
lib/providers/
├── types.ts                    # ImageProvider interface
├── factory.ts                  # Image provider factory
├── openai/
│   ├── openai-provider.ts      # OpenAI GPT Image 2 provider
│   └── openai-image-client.ts  # OpenAI Image API helpers
├── openrouter/
│   ├── openrouter-provider.ts      # OpenRouter GPT-5.4 Image 2 provider
│   └── openrouter-image-client.ts  # OpenRouter Chat Completions image helpers
├── gemini/
│   └── gemini-provider.ts      # Gemini (original) provider
├── gemini3/
│   └── gemini3-provider.ts     # Gemini 3 provider
├── comfyui/
│   ├── comfyui-provider.ts     # ComfyUI provider
│   ├── comfyui-client.ts       # HTTP client
│   ├── workflow-builder.ts     # Workflow construction
│   └── config.ts               # Connection settings
└── audio/
    ├── types.ts                # AudioProvider interface
    ├── factory.ts              # Audio provider factory
    └── audiocraft-provider.ts  # AudioCraft/ElevenLabs HTTP client
```
