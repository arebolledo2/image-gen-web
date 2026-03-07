// Provider type definitions for image generation (separate from AI chat model providers)

export interface ImageProvider {
  name: 'gemini' | 'gemini3' | 'comfyui';
  testConnection(): Promise<boolean>;
  generateImage(options: GenerationOptions): Promise<GenerationResult>;
}

export interface GenerationOptions {
  prompt: string;
  batchId: string;
  batchPromptId: string;
  runNumber: number;
  generationId: string;
  parameters?: Record<string, unknown>;
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

export type AIProvider = 'ollama' | 'gemini';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}