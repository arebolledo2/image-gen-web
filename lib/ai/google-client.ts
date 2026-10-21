import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Shared Google Generative AI client. Reads GEMINI_API_KEY (the variable used
 * everywhere else in this app); if unset, the SDK falls back to its own
 * GOOGLE_GENERATIVE_AI_API_KEY.
 */
export const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
