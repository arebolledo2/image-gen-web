import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

/**
 * Wrapped Gemini model with DevTools middleware for local development.
 * DevTools data is stored in .devtools/generations.json (gitignored).
 * Only enabled in development (NODE_ENV !== 'production').
 */
export const getModel = (modelId: string = 'gemini-3.1-flash-preview') => {
  const baseModel = google(modelId);

  // Only enable DevTools in development
  if (process.env.NODE_ENV === 'production') {
    return baseModel;
  }

  return wrapLanguageModel({
    model: baseModel,
    middleware: devToolsMiddleware(),
  });
};

// Export specific model instances
export const geminiFlash = getModel('gemini-3.1-flash-preview');
export const gemini25Flash = getModel('gemini-2.5-flash');
export const gemini25FlashImage = getModel('gemini-2.5-flash-image-preview');
