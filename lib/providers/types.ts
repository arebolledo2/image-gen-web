export interface GenerationOptions {
  prompt: string;
  batchId: string;
  batchPromptId: string;
  runNumber: number;
  generationId: string; // pre-created generation record
  parameters?: Record<string, any>;
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
  metadata: Record<string, any>;
}

export interface ImageProvider {
  name: 'gemini' | 'comfyui';
  testConnection(): Promise<boolean>;
  generateImage(options: GenerationOptions): Promise<GenerationResult>;
}
