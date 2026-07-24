// Provider type definitions for image generation (separate from AI chat model providers)
export type { AIProvider } from "@/lib/ai/config";
import type { ImageGenerationParameters } from "@/lib/types/common";

export type ImageProviderName = 'openai' | 'openrouter' | 'gemini' | 'gemini3' | 'comfyui' | 'comfyui-krea';

export interface ImageProvider {
  name: ImageProviderName;
  testConnection(): Promise<boolean>;
  generateImage(options: GenerationOptions): Promise<GenerationResult>;
}

export interface GenerationOptions {
  prompt: string;
  batchId: string;
  batchPromptId: string;
  runNumber: number;
  generationId: string;
  parameters?: ImageGenerationParameters;
}

export interface GenerationResult {
  generationId: string;
  images: Array<{
    id: string;
    filePath: string;
    fileName: string;
    mediaType: string;
    fileSize?: number;
  }>;
  metadata: Record<string, unknown>;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}
