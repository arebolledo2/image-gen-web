import { inngest } from './client';
import { getProvider } from '@/lib/providers/factory';
import { db } from '@/lib/db';
import { batches, generations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ImageGenerationJob } from './types';

export const imageGenerationFunction = inngest.createFunction(
  { id: 'image-generation' },
  { event: 'image/generate' },
  async ({ event, step }) => {
    const job = event.data as ImageGenerationJob;
    const { provider, generationId, prompt, runNumber, batchId, batchPromptId, parameters } = job;

    console.log(`[Inngest] Processing generation ${generationId} with ${provider}`);

    try {
      await step.run('generate-image', async () => {
        const imageProvider = getProvider(provider);

        await imageProvider.generateImage({
          prompt,
          batchId,
          batchPromptId,
          runNumber,
          generationId,
          parameters,
        });
      });

      // Check if all generations in batch are complete
      await step.run('update-batch-status', async () => {
        await updateBatchStatus(batchId);
      });

      return { success: true, generationId };
    } catch (error) {
      console.error(`[Inngest] Failed generation ${generationId}:`, error);

      // Check batch status even on failure
      await updateBatchStatus(batchId);

      throw error;
    }
  }
);

async function updateBatchStatus(batchId: string) {
  // Get all generations for batch
  const allGenerations = await db.query.generations.findMany({
    where: eq(generations.batchId, batchId),
  });

  const pending = allGenerations.filter(g => g.status === 'pending' || g.status === 'running').length;
  const failed = allGenerations.filter(g => g.status === 'failed').length;

  if (pending === 0) {
    // All done
    const newStatus = failed > 0 ? 'failed' : 'completed';
    await db.update(batches)
      .set({
        status: newStatus,
        completedAt: new Date(),
      })
      .where(eq(batches.id, batchId));
  } else {
    // Some still running
    await db.update(batches)
      .set({ status: 'running' })
      .where(eq(batches.id, batchId));
  }
}
