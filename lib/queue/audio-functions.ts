import { inngest } from './client';
import { getAudioProvider } from '@/lib/providers/audio/factory';
import { db } from '@/lib/db';
import { audioBatches, audioGenerations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { AudioGenerationJob } from './audio-types';

export const audioGenerationFunction = inngest.createFunction(
  { id: 'audio-generation' },
  { event: 'audio/generate' },
  async ({ event, step }) => {
    const job = event.data as AudioGenerationJob;
    const { provider, audioGenerationId, prompt, runNumber, audioBatchId, audioBatchPromptId, parameters } = job;

    console.log(`[Inngest] Processing audio generation ${audioGenerationId} with ${provider}`);

    try {
      await step.run('generate-audio', async () => {
        const audioProvider = getAudioProvider(provider);

        await audioProvider.generateAudio({
          prompt,
          duration: parameters?.duration,
          temperature: parameters?.temperature,
          topK: parameters?.topK,
          cfgCoef: parameters?.cfgCoef,
        }, audioGenerationId);
      });

      // Check if all generations in batch are complete
      await step.run('update-audio-batch-status', async () => {
        await updateAudioBatchStatus(audioBatchId);
      });

      return { success: true, audioGenerationId };
    } catch (error) {
      console.error(`[Inngest] Failed audio generation ${audioGenerationId}:`, error);

      // Check batch status even on failure
      await updateAudioBatchStatus(audioBatchId);

      throw error;
    }
  }
);

async function updateAudioBatchStatus(audioBatchId: string) {
  // Get all generations for batch
  const allGenerations = await db.query.audioGenerations.findMany({
    where: eq(audioGenerations.audioBatchId, audioBatchId),
  });

  const pending = allGenerations.filter(g => g.status === 'pending' || g.status === 'running').length;
  const failed = allGenerations.filter(g => g.status === 'failed').length;

  if (pending === 0) {
    // All done
    const newStatus = failed > 0 ? 'failed' : 'completed';
    await db.update(audioBatches)
      .set({
        status: newStatus,
        completedAt: new Date(),
      })
      .where(eq(audioBatches.id, audioBatchId));
  } else {
    // Some still running
    await db.update(audioBatches)
      .set({ status: 'running' })
      .where(eq(audioBatches.id, audioBatchId));
  }
}
