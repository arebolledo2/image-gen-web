import PgBoss from 'pg-boss';
import { ImageGenerationJob } from '../types';
import { QUEUE_CONFIG } from '../config';
import { getProvider } from '@/lib/providers/factory';
import { db } from '@/lib/db';
import { batches, generations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function imageGenerationWorkerHandler(job: PgBoss.Job<ImageGenerationJob>) {
  const { provider, generationId, prompt, runNumber, batchId, batchPromptId, parameters } = job.data;

  console.log(`[Worker] Processing generation ${generationId} with ${provider}`);

  try {
    const imageProvider = getProvider(provider);

    await imageProvider.generateImage({
      prompt,
      batchId,
      batchPromptId,
      runNumber,
      generationId,
      parameters,
    });

    // Check if all generations in batch are complete
    await updateBatchStatus(batchId);

  } catch (error) {
    console.error(`[Worker] Failed generation ${generationId}:`, error);

    // Check batch status even on failure
    await updateBatchStatus(batchId);

    throw error; // Let pg-boss handle retry
  }
}

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

export function registerImageGenerationWorker(boss: PgBoss) {
  boss.work(
    QUEUE_CONFIG.queues.imageGeneration,
    {
      teamSize: 2,
      teamConcurrency: 1,
    },
    imageGenerationWorkerHandler
  );
}
