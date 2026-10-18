/**
 * Service for managing audio batches with transaction support.
 * Note: Uses `any` for dynamic JSON data and Drizzle ORM operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import { audioBatches, audioBatchPrompts, audioGenerations, AudioBatch, NewAudioBatch, AudioGeneration, NewAudioGeneration } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { BaseService } from './base.service';
import { queueAudioBatchExecution } from '@/lib/queue/audio-batch-queue';
import { notFound } from '@/lib/api/errors';
import type { AudioBatchPromptOverrides, AudioBatchDefaults } from '@/lib/types/common';

/**
 * Audio batches group multiple prompts for bulk audio generation.
 * This service ensures atomic operations for batch creation and execution.
 */
export class AudioBatchesService extends BaseService<typeof audioBatches, AudioBatch, NewAudioBatch> {
  constructor() {
    super(audioBatches);
  }

  /**
   * Get all audio batches with their prompts and preview audio files
   *
   * @returns All audio batches with related data
   */
  async getAllAudioBatchesWithDetails() {
    return db.query.audioBatches.findMany({
      orderBy: [desc(audioBatches.createdAt)],
      with: {
        audioBatchPrompts: true,
        audioGenerations: {
          with: {
            audioFiles: {
              limit: 3,
            },
          },
          limit: 3,
        },
      },
    });
  }

  /**
   * Get an audio batch by ID with all related data
   *
   * @param id - Audio Batch ID
   * @returns Audio batch with prompts, generations, and lineage
   */
  async getAudioBatchWithDetails(id: string) {
    return db.query.audioBatches.findFirst({
      where: eq(audioBatches.id, id),
      with: {
        parentAudioBatch: true,
        childAudioBatches: {
          orderBy: (batches, { desc }) => [desc(batches.version)],
        },
        audioBatchPrompts: {
          orderBy: (prompts, { asc }) => [asc(prompts.order)],
        },
        audioGenerations: {
          with: {
            audioFiles: true,
          },
        },
      },
    });
  }

  /**
   * Create a new audio batch with prompts atomically
   *
   * @param data - Audio batch data with prompts
   * @returns Created audio batch with all relations
   */
  async createAudioBatch(data: {
    name: string;
    description?: string;
    provider?: 'audiocraft';
    defaults?: {
      duration?: number;
      count?: number;
      temperature?: number;
      topK?: number;
      cfgCoef?: number;
    };
    prompts: Array<{
      promptText: string;
      overrides?: {
        duration?: number;
        count?: number;
        temperature?: number;
        topK?: number;
        cfgCoef?: number;
      };
    }>;
  }) {
    return this.transaction(async (tx) => {
      // Validate that we have at least one prompt
      if (!data.prompts || data.prompts.length === 0) {
        throw new Error('At least one prompt is required');
      }

      // Create the audio batch
      const [batch] = await tx
        .insert(audioBatches)
        .values({
          name: data.name,
          description: data.description,
          provider: data.provider || 'audiocraft',
          status: 'draft',
          defaults: data.defaults || {},
          version: 1,
        })
        .returning();

      // Create audio batch prompts
      const audioBatchPromptsData = data.prompts.map((prompt, index) => ({
        audioBatchId: batch.id,
        promptText: prompt.promptText,
        overrides: prompt.overrides || {},
        order: index,
      }));

      await tx.insert(audioBatchPrompts).values(audioBatchPromptsData);

      // Return complete batch with relations
      return tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, batch.id),
        with: {
          audioBatchPrompts: true,
        },
      });
    });
  }

  /**
   * Create a new version of an existing audio batch
   *
   * @param parentAudioBatchId - ID of the parent audio batch
   * @param data - Updated audio batch data
   * @returns Created audio batch version
   */
  async createAudioBatchVersion(
    parentAudioBatchId: string,
    data: {
      name?: string;
      description?: string;
      provider?: 'audiocraft' | 'elevenlabs';
      defaults?: Partial<AudioBatchDefaults>;
      prompts?: Array<{
        promptText: string;
        overrides?: AudioBatchPromptOverrides;
      }>;
    }
  ) {
    return this.transaction(async (tx) => {
      // Get parent batch
      const parentBatch = await tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, parentAudioBatchId),
        with: {
          audioBatchPrompts: true,
        },
      });

      if (!parentBatch) {
        throw new Error(`Parent audio batch ${parentAudioBatchId} not found`);
      }

      // Merge parent defaults with new defaults
      const mergedDefaults = {
        ...(parentBatch.defaults as AudioBatchDefaults || {}),
        ...(data.defaults || {}),
      };

      // Create new version
      const [batch] = await tx
        .insert(audioBatches)
        .values({
          name: data.name ?? parentBatch.name,
          description: data.description ?? parentBatch.description,
          provider: data.provider ?? parentBatch.provider,
          status: 'draft',
          defaults: mergedDefaults,
          parentAudioBatchId,
          version: parentBatch.version + 1,
        })
        .returning();

      // Copy or use new prompts
      const promptsToUse = data.prompts || parentBatch.audioBatchPrompts.map((bp: any) => ({
        promptText: bp.promptText,
        overrides: bp.overrides,
      }));

      const audioBatchPromptsData = promptsToUse.map((prompt: any, index: number) => ({
        audioBatchId: batch.id,
        promptText: prompt.promptText,
        overrides: prompt.overrides || {},
        order: index,
      }));

      await tx.insert(audioBatchPrompts).values(audioBatchPromptsData);

      return tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, batch.id),
        with: {
          audioBatchPrompts: true,
        },
      });
    });
  }

  /**
   * Update audio batch metadata (not prompts)
   *
   * @param id - Audio Batch ID
   * @param data - Updated audio batch data
   * @returns Updated audio batch
   */
  async updateAudioBatch(
    id: string,
    data: {
      name?: string;
      description?: string;
      provider?: 'audiocraft' | 'elevenlabs';
      defaults?: Partial<AudioBatchDefaults>;
    }
  ): Promise<AudioBatch | undefined> {
    return this.update(id, data);
  }

  /**
   * Mark an audio batch as queued and enqueue one job per prompt run.
   * If enqueueing fails the batch is marked failed instead of being left as queued.
   *
   * @throws ApiError 404 if the audio batch does not exist
   * @returns Number of jobs queued
   */
  async executeAudioBatch(id: string): Promise<{ jobsQueued: number }> {
    const audioBatch = await db.query.audioBatches.findFirst({
      where: eq(audioBatches.id, id),
      with: {
        audioBatchPrompts: {
          orderBy: (audioBatchPrompts, { asc }) => [asc(audioBatchPrompts.order)],
        },
      },
    });
    if (!audioBatch) throw notFound('Audio batch');

    await this.updateAudioBatchStatus(id, 'queued');
    try {
      return await queueAudioBatchExecution(audioBatch);
    } catch (error) {
      await this.updateAudioBatchStatus(id, 'failed');
      throw error;
    }
  }

  /**
   * Update audio batch status with optimistic concurrency control
   *
   * @param id - Audio Batch ID
   * @param status - New status
   * @param expectedVersion - Expected version number (for optimistic locking)
   * @returns Updated audio batch or undefined if version mismatch
   */
  async updateAudioBatchStatus(
    id: string,
    status: 'draft' | 'queued' | 'running' | 'completed' | 'failed',
    expectedVersion?: number
  ): Promise<AudioBatch | undefined> {
    return this.transaction(async (tx) => {
      // Get current batch
      const currentBatch = await tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, id),
      });

      if (!currentBatch) {
        return undefined;
      }

      // Check version if provided (optimistic concurrency control)
      if (expectedVersion !== undefined && currentBatch.version !== expectedVersion) {
        throw new Error(`Version mismatch: expected ${expectedVersion}, got ${currentBatch.version}`);
      }

      // Update status and optionally set completedAt
      const updateData: Partial<NewAudioBatch> & { updatedAt: Date; completedAt?: Date } = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
      }

      const [updated] = await tx
        .update(audioBatches)
        .set(updateData)
        .where(eq(audioBatches.id, id))
        .returning();

      return updated;
    });
  }

  /**
   * Create audio generation records for a batch
   * This prepares the batch for execution by creating generation placeholders
   *
   * @param audioBatchId - Audio Batch ID
   * @returns Array of created audio generation records
   */
  async createGenerationsForAudioBatch(audioBatchId: string): Promise<AudioGeneration[]> {
    return this.transaction(async (tx) => {
      // Get batch with prompts and defaults
      const batch = await tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, audioBatchId),
        with: {
          audioBatchPrompts: true,
        },
      });

      if (!batch) {
        throw new Error(`Audio batch ${audioBatchId} not found`);
      }

      const generationsData: NewAudioGeneration[] = [];

      // Create generation records for each prompt
      for (const audioBatchPrompt of batch.audioBatchPrompts) {
        const overrides = audioBatchPrompt.overrides as AudioBatchPromptOverrides | null;
        const defaults = batch.defaults as AudioBatchDefaults | null;
        const count = overrides?.count ?? defaults?.count ?? 1;

        // Create multiple generations if count > 1
        for (let i = 0; i < count; i++) {
          generationsData.push({
            audioBatchId: batch.id,
            audioBatchPromptId: audioBatchPrompt.id,
            status: 'pending',
            runNumber: i + 1,
          });
        }
      }

      // Insert all generations atomically
      if (generationsData.length > 0) {
        return tx.insert(audioGenerations).values(generationsData).returning();
      }

      return [];
    });
  }

  /**
   * Calculate audio batch completion status based on generations
   *
   * @param audioBatchId - Audio Batch ID
   * @returns Status summary
   */
  async getAudioBatchCompletionStatus(audioBatchId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
    isComplete: boolean;
    finalStatus: 'completed' | 'failed' | 'running';
  }> {
    const allGenerations = await db.query.audioGenerations.findMany({
      where: eq(audioGenerations.audioBatchId, audioBatchId),
    });

    const pending = allGenerations.filter(g => g.status === 'pending').length;
    const running = allGenerations.filter(g => g.status === 'running').length;
    const success = allGenerations.filter(g => g.status === 'success').length;
    const failed = allGenerations.filter(g => g.status === 'failed').length;

    const isComplete = pending === 0 && running === 0;
    const finalStatus = isComplete
      ? (failed > 0 ? 'failed' : 'completed')
      : 'running';

    return {
      total: allGenerations.length,
      pending,
      running,
      success,
      failed,
      isComplete,
      finalStatus,
    };
  }

  /**
   * Delete an audio batch and all related data
   * WARNING: This will cascade delete prompts, generations, and audio files
   *
   * @param id - Audio Batch ID
   * @returns true if deleted
   */
  async deleteAudioBatch(id: string): Promise<boolean> {
    return this.transaction(async (tx) => {
      // Get batch to find all related records
      const batch = await tx.query.audioBatches.findFirst({
        where: eq(audioBatches.id, id),
        with: {
          audioBatchPrompts: true,
          audioGenerations: {
            with: {
              audioFiles: true,
            },
          },
        },
      });

      if (!batch) {
        return false;
      }

      // Note: With proper foreign key constraints, this would cascade automatically
      // For now, we need to manually delete in the correct order

      // Delete audio files first (leaf nodes)
      const audioFileIds = batch.audioGenerations.flatMap((g: any) => g.audioFiles.map((f: any) => f.id));
      if (audioFileIds.length > 0) {
        const { audioFiles } = await import('@/lib/db/schema');
        await tx.delete(audioFiles).where(inArray(audioFiles.id, audioFileIds));
      }

      // Delete audio generations
      const generationIds = batch.audioGenerations.map((g: any) => g.id);
      if (generationIds.length > 0) {
        await tx.delete(audioGenerations).where(inArray(audioGenerations.id, generationIds));
      }

      // Delete audio batch prompts
      await tx.delete(audioBatchPrompts).where(eq(audioBatchPrompts.audioBatchId, id));

      // Delete audio batch
      await tx.delete(audioBatches).where(eq(audioBatches.id, id));

      return true;
    });
  }
}

// Export singleton instance
export const audioBatchesService = new AudioBatchesService();
