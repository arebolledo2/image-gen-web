import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import type { AIProvider, AIRequestConfig, AIRequestConfigInput, AIModelSelection } from "./config";

export const DEFAULT_GEMINI_CHAT_MODEL = "gemini-3.1-flash-preview";
export const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-2.5-flash-image-preview";
export const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
export const DEFAULT_OPENAI_ANALYSIS_MODEL = "gpt-5.4-mini";

const ENV_AI_MODEL_PROVIDER = process.env.AI_MODEL_PROVIDER ?? "gemini";
const ENV_OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const ENV_OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL ?? "qwen3.5:9b-q8_0";
const ENV_OPENAI_DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL ?? DEFAULT_OPENAI_CHAT_MODEL;

function wrapIfDev(model: LanguageModelV3): LanguageModelV3 {
  if (process.env.NODE_ENV === "production") {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: devToolsMiddleware(),
  });
}

function isProvider(value: string | undefined): value is AIProvider {
  return value === "gemini" || value === "ollama" || value === "openai";
}

function sanitizeModelId(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed.slice(0, 256);
}

function sanitizeUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function ensureOllamaApiBaseUrl(value: string): string {
  const parsed = new URL(value);
  const normalizedPath = parsed.pathname.replace(/\/$/, "");
  parsed.pathname = normalizedPath.endsWith("/api") ? normalizedPath : `${normalizedPath}/api`;
  return parsed.toString().replace(/\/$/, "");
}

function envDefaultProvider(): AIProvider {
  return isProvider(ENV_AI_MODEL_PROVIDER) ? ENV_AI_MODEL_PROVIDER : "gemini";
}

function defaultModelForProvider(provider: AIProvider, kind: "chat" | "analysis"): string {
  if (provider === "ollama") {
    return ENV_OLLAMA_DEFAULT_MODEL;
  }

  if (provider === "openai") {
    return kind === "chat" ? ENV_OPENAI_DEFAULT_MODEL : ENV_OPENAI_DEFAULT_MODEL;
  }

  return kind === "chat" ? DEFAULT_GEMINI_CHAT_MODEL : DEFAULT_GEMINI_ANALYSIS_MODEL;
}

export function resolveAIRequestConfig(input?: AIRequestConfigInput | null): AIRequestConfig {
  const defaultProvider = envDefaultProvider();
  const defaultOllamaBaseUrl = sanitizeUrl(undefined, ENV_OLLAMA_BASE_URL);
  const sanitizedOllamaBaseUrl = sanitizeUrl(input?.ollamaBaseUrl, defaultOllamaBaseUrl);

  const chatProvider = isProvider(input?.chat?.provider) ? input.chat.provider : defaultProvider;
  const analysisProvider = isProvider(input?.analysis?.provider) ? input.analysis.provider : defaultProvider;

  return {
    ollamaBaseUrl: sanitizedOllamaBaseUrl,
    chat: {
      provider: chatProvider,
      model: sanitizeModelId(
        input?.chat?.model,
        defaultModelForProvider(chatProvider, "chat"),
      ),
    },
    analysis: {
      provider: analysisProvider,
      model: sanitizeModelId(
        input?.analysis?.model,
        defaultModelForProvider(analysisProvider, "analysis"),
      ),
    },
  };
}

function resolveLanguageModel(selection: AIModelSelection, config: AIRequestConfig): LanguageModelV3 {
  if (selection.provider === "ollama") {
    const ollama = createOllama({
      baseURL: ensureOllamaApiBaseUrl(config.ollamaBaseUrl ?? ENV_OLLAMA_BASE_URL),
    });

    return wrapIfDev(ollama(selection.model));
  }

  if (selection.provider === "openai") {
    return wrapIfDev(openai(selection.model));
  }

  return wrapIfDev(google(selection.model));
}

export function getChatModelForConfig(config: AIRequestConfig): LanguageModelV3 {
  return resolveLanguageModel(config.chat, config);
}

export function getAnalysisModelForConfig(config: AIRequestConfig): LanguageModelV3 {
  return resolveLanguageModel(config.analysis, config);
}

export function getChatModel(modelId?: string): LanguageModelV3 {
  const config = resolveAIRequestConfig({
    chat: {
      provider: envDefaultProvider(),
      model: modelId,
    },
  });

  return getChatModelForConfig(config);
}

/**
 * Backwards-compatible helper for routes/components that always need a Gemini vision model.
 */
export function getVisionModel(modelId: string = DEFAULT_GEMINI_ANALYSIS_MODEL): LanguageModelV3 {
  const visionModel = sanitizeModelId(modelId, DEFAULT_GEMINI_ANALYSIS_MODEL);
  return wrapIfDev(google(visionModel));
}

// Exported instances retained for existing non-chat agent modules.
export const geminiFlash = getChatModel(DEFAULT_GEMINI_CHAT_MODEL);
export const gemini25Flash = getChatModel("gemini-2.5-flash");
export const gemini25FlashImage = getVisionModel(DEFAULT_GEMINI_ANALYSIS_MODEL);

export interface AIModelConfig {
  provider: AIProvider;
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;
}

export const aiModelConfig: AIModelConfig = {
  provider: envDefaultProvider(),
  ollamaBaseUrl: ENV_OLLAMA_BASE_URL,
  ollamaDefaultModel: ENV_OLLAMA_DEFAULT_MODEL,
};

export async function checkOllamaConnection(baseUrl?: string): Promise<boolean> {
  const provider = envDefaultProvider();
  if (provider !== "ollama") {
    return false;
  }

  const resolvedBaseUrl = sanitizeUrl(baseUrl, ENV_OLLAMA_BASE_URL);

  try {
    const response = await fetch(`${resolvedBaseUrl}/api/tags`);
    return response.ok;
  } catch (error) {
    console.error("Ollama connection check failed:", error);
    return false;
  }
}
