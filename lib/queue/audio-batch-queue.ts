import { inngest } from './client';
import { AudioGenerationJob } from './audio-types';
import { db } from '@/lib/db';
import { audioGenerations } from '@/lib/db/schema';

export async function queueAudioBatchExecution(audioBatch: any) {
  // Create audio generation records upfront (status: pending)
  const jobs: AudioGenerationJob[] = [];

  for (const audioBatchPrompt of audioBatch.audioBatchPrompts) {
    const count = audioBatchPrompt.overrides?.count || audioBatch.defaults?.count || 1;

    for (let run = 1; run <= count; run++) {
      // Create audio generation record
      const [generation] = await db.insert(audioGenerations).values({
        audioBatchId: audioBatch.id,
        audioBatchPromptId: audioBatchPrompt.id,
        runNumber: run,
        status: 'pending',
      }).returning();

      // Create job payload
      const job: AudioGenerationJob = {
        jobType: 'audio-generation',
        audioBatchId: audioBatch.id,
        audioBatchPromptId: audioBatchPrompt.id,
        audioGenerationId: generation.id,
        provider: audioBatch.provider,
        prompt: audioBatchPrompt.promptText,
        runNumber: run,
        parameters: buildParameters(audioBatch, audioBatchPrompt),
      };

      jobs.push(job);

      // Send event to Inngest
      await inngest.send({
        name: 'audio/generate',
        data: job,
      });
    }
  }

  return { jobsQueued: jobs.length };
}

function buildParameters(audioBatch: any, audioBatchPrompt: any): {
  duration?: number;
  temperature?: number;
  topK?: number;
  cfgCoef?: number;
} {
  const parameters: {
    duration?: number;
    temperature?: number;
    topK?: number;
    cfgCoef?: number;
  } = {};

  // Get parameters from audioBatchPrompt override or audioBatch default
  // Use ?? instead of || to preserve 0 as a valid value (for auto-duration)
  parameters.duration = audioBatchPrompt.overrides?.duration ?? audioBatch.defaults?.duration;
  parameters.temperature = audioBatchPrompt.overrides?.temperature ?? audioBatch.defaults?.temperature ?? 1.0;
  parameters.topK = audioBatchPrompt.overrides?.topK ?? audioBatch.defaults?.topK ?? 250;
  parameters.cfgCoef = audioBatchPrompt.overrides?.cfgCoef ?? audioBatch.defaults?.cfgCoef ?? 3.0;

  return parameters;
}
