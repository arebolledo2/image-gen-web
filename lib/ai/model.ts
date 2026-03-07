import { google } from '@ai-sdk/google';
import { wrapLanguageModel, type LanguageModel } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { ollama } from 'ollama-ai-provider-v2';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-preview';

/**
 * AI Model Configuration from environment variables.
 * 
 * Environment Variables:
 * - AI_MODEL_PROVIDER: "ollama" | "gemini" (default: "gemini")
 * - OLLAMA_BASE_URL: URL to Ollama server (default: http://localhost:11434)
 * - OLLAMA_DEFAULT_MODEL: Default model for Ollama (default: qwen3.5:9b-q8_0)
 */
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'qwen3.5:9b-q8_0';

/**
 * Get the text model to use for chat operations.
 * @param modelId - Optional override for specific model ID (Gemini only)
 * @returns A configured language model instance
 */
export function getChatModel(modelId?: string): LanguageModel {
  const provider = process.env.AI_MODEL_PROVIDER ?? 'gemini';
  
  if (provider === 'ollama') {
    return ollama(OLLAMA_DEFAULT_MODEL);
  }

  const baseModel = google(modelId ?? DEFAULT_GEMINI_MODEL);

  // Only enable DevTools in development
  if (process.env.NODE_ENV === 'production') {
    return baseModel;
  }

  return wrapLanguageModel({
    model: baseModel,
    middleware: devToolsMiddleware(),
  });
}

/**
 * Get the vision model for image analysis.
 * Always uses Gemini as Ollama models typically don't support vision.
 */
export function getVisionModel(modelId: string = 'gemini-2.5-flash-image-preview'): LanguageModel {
  const baseModel = google(modelId);

  // Only enable DevTools in development
  if (process.env.NODE_ENV === 'production') {
    return baseModel;
  }

  return wrapLanguageModel({
    model: baseModel,
    middleware: devToolsMiddleware(),
  });
}

// Export specific model instances for backward compatibility
export const geminiFlash = getChatModel('gemini-3.1-flash-preview');
export const gemini25Flash = getChatModel('gemini-2.5-flash');
export const gemini25FlashImage = getVisionModel('gemini-2.5-flash-image-preview');

// Export configuration info for runtime inspection
export interface AIModelConfig {
  provider: 'ollama' | 'gemini';
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;
}

export const aiModelConfig: AIModelConfig = {
  provider: (process.env.AI_MODEL_PROVIDER ?? 'gemini') as 'ollama' | 'gemini',
  ollamaBaseUrl: OLLAMA_BASE_URL,
  ollamaDefaultModel: OLLAMA_DEFAULT_MODEL,
};

/**
 * Check if Ollama is configured and available.
 */
export async function checkOllamaConnection(): Promise<boolean> {
  const provider = (process.env.AI_MODEL_PROVIDER ?? 'gemini') as 'ollama' | 'gemini';
  
  if (provider !== 'ollama') {
    return false;
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    console.error('Ollama connection check failed:', error);
    return false;
  }
}
