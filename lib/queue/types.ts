export interface ImageGenerationJob {
  jobType: 'image-generation';
  batchId: string;
  batchPromptId: string;
  generationId: string;
  provider: 'gemini' | 'comfyui';
  prompt: string;
  runNumber: number;
  parameters?: Record<string, any>;
}
