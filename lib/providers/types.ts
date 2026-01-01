export interface GenerationOptions {
  prompt: string;
  batchId: string;
  batchPromptId: string;
  runNumber: number;
  generationId: string; // pre-created generation record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
}

export interface ImageProvider {
  name: 'gemini' | 'gemini3' | 'comfyui';
  testConnection(): Promise<boolean>;
  generateImage(options: GenerationOptions): Promise<GenerationResult>;
}
