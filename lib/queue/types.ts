import type { ImageGenerationParameters } from '@/lib/types/common';
import type { ImageProviderName } from '@/lib/providers/types';

export interface ImageGenerationJob {
  jobType: 'image-generation';
  batchId: string;
  batchPromptId: string;
  generationId: string;
  provider: ImageProviderName;
  prompt: string;
  runNumber: number;
  parameters?: ImageGenerationParameters;
}
