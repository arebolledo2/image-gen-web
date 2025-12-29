import type { ImageGenerationParameters } from '@/lib/types/common';

export interface ImageGenerationJob {
  jobType: 'image-generation';
  batchId: string;
  batchPromptId: string;
  generationId: string;
  provider: 'gemini' | 'gemini3' | 'comfyui';
  prompt: string;
  runNumber: number;
  parameters?: ImageGenerationParameters;
}
