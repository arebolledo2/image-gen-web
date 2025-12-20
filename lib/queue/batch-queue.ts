import { inngest } from './client';
import { ImageGenerationJob } from './types';
import { db } from '@/lib/db';
import { generations } from '@/lib/db/schema';

export async function queueBatchExecution(batch: any) {
  // Create generation records upfront (status: pending)
  const jobs: ImageGenerationJob[] = [];

  for (const batchPrompt of batch.batchPrompts) {
    const count = batchPrompt.overrides?.count || batch.defaults?.count || 1;

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
