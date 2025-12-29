import { inngest } from './client';
import { AudioGenerationJob } from './audio-types';
import { db } from '@/lib/db';
import { audioGenerations, AudioBatch, AudioBatchPrompt } from '@/lib/db/schema';
import type { AudioBatchDefaults, AudioBatchPromptOverrides, AudioGenerationParameters } from '@/lib/types/common';

interface AudioBatchWithPrompts extends AudioBatch {
  audioBatchPrompts: AudioBatchPrompt[];
}

export async function queueAudioBatchExecution(audioBatch: AudioBatchWithPrompts) {
  // Create audio generation records upfront (status: pending)
  const jobs: AudioGenerationJob[] = [];

  for (const audioBatchPrompt of audioBatch.audioBatchPrompts) {
    const overrides = audioBatchPrompt.overrides as AudioBatchPromptOverrides | null;
    const defaults = audioBatch.defaults as AudioBatchDefaults | null;
    const count = overrides?.count || defaults?.count || 1;

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

function buildParameters(audioBatch: AudioBatchWithPrompts, audioBatchPrompt: AudioBatchPrompt): AudioGenerationParameters {
  const overrides = audioBatchPrompt.overrides as AudioBatchPromptOverrides | null;
  const defaults = audioBatch.defaults as AudioBatchDefaults | null;

  const parameters: AudioGenerationParameters = {};

  // Get parameters from audioBatchPrompt override or audioBatch default
  // Use ?? instead of || to preserve 0 as a valid value (for auto-duration)
  parameters.duration = overrides?.duration ?? defaults?.duration;
  parameters.temperature = overrides?.temperature ?? defaults?.temperature ?? 1.0;
  parameters.topK = overrides?.topK ?? defaults?.topK ?? 250;
  parameters.cfgCoef = overrides?.cfgCoef ?? defaults?.cfgCoef ?? 3.0;

  return parameters;
}
