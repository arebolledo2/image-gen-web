export interface AudioGenerationJob {
  jobType: 'audio-generation';
  audioBatchId: string;
  audioBatchPromptId: string;
  audioGenerationId: string;
  provider: 'audiocraft';
  prompt: string;
  runNumber: number;
  parameters?: {
    duration?: number;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
  };
}
