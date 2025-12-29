import { inngest } from './client';
import { ImageGenerationJob } from './types';
import { db } from '@/lib/db';
import { generations, Batch, BatchPrompt } from '@/lib/db/schema';
import { getResolutionPreset } from '@/lib/config/resolution-presets';
import type { ImageGenerationParameters, BatchDefaults, BatchPromptOverrides } from '@/lib/types/common';

interface BatchWithPrompts extends Batch {
  batchPrompts: BatchPrompt[];
}

export async function queueBatchExecution(batch: BatchWithPrompts) {
  // Create generation records upfront (status: pending)
  const jobs: ImageGenerationJob[] = [];

  for (const batchPrompt of batch.batchPrompts) {
    const overrides = batchPrompt.overrides as BatchPromptOverrides | null;
    const defaults = batch.defaults as BatchDefaults | null;
    const count = overrides?.count || defaults?.count || 1;

    for (let run = 1; run <= count; run++) {
      // Create generation record
      const [generation] = await db.insert(generations).values({
        batchId: batch.id,
        batchPromptId: batchPrompt.id,
        runNumber: run,
        status: 'pending',
      }).returning();

      // Create job payload
      const job: ImageGenerationJob = {
        jobType: 'image-generation',
        batchId: batch.id,
        batchPromptId: batchPrompt.id,
        generationId: generation.id,
        provider: batch.provider,
        prompt: batchPrompt.promptText,
        runNumber: run,
        parameters: buildParameters(batch, batchPrompt),
      };

      jobs.push(job);

      // Send event to Inngest
      await inngest.send({
        name: 'image/generate',
        data: job,
      });
    }
  }

  return { jobsQueued: jobs.length };
}

function buildParameters(batch: BatchWithPrompts, batchPrompt: BatchPrompt): ImageGenerationParameters {
  const parameters: ImageGenerationParameters = {};

  const overrides = batchPrompt.overrides as BatchPromptOverrides | null;
  const defaults = batch.defaults as BatchDefaults | null;

  // Get resolution from batchPrompt override or batch default
  const resolutionId = overrides?.resolution || defaults?.resolution;

  if (resolutionId) {
    const preset = getResolutionPreset(resolutionId);
    if (preset) {
      // For ComfyUI: include width and height
      if (batch.provider === 'comfyui') {
        parameters.width = preset.width;
        parameters.height = preset.height;
      }

      // For Gemini: include imageConfig
      if (batch.provider === 'gemini') {
        parameters.imageConfig = {
          aspectRatio: preset.aspectRatio,
          imageSize: preset.geminiImageSize,
        };
      }
    }
  }

  return parameters;
}
