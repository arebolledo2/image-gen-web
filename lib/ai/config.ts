import { z } from "zod";

export const AI_PROVIDERS = ["gemini", "ollama"] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number];

export interface AIModelSelection {
  provider: AIProvider;
  model: string;
}

export interface AIRequestConfig {
  ollamaBaseUrl?: string;
  chat: AIModelSelection;
  analysis: AIModelSelection;
}

export interface AIRequestConfigInput {
  ollamaBaseUrl?: string;
  chat?: Partial<AIModelSelection>;
  analysis?: Partial<AIModelSelection>;
}

export const aiProviderSchema = z.enum(AI_PROVIDERS);

export const aiModelSelectionInputSchema = z.object({
  provider: aiProviderSchema.optional(),
  model: z.string().optional(),
});

export const aiRequestConfigInputSchema = z.object({
  ollamaBaseUrl: z.string().optional(),
  chat: aiModelSelectionInputSchema.optional(),
  analysis: aiModelSelectionInputSchema.optional(),
});
