/**
 * Service for batch execution operations: generation creation, status tracking,
 * and completion monitoring.
 *
 * Separated from BatchesService (CRUD) for single-responsibility.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import { batches, generations, Batch, NewBatch, NewGeneration, Generation } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { BatchPromptOverrides, BatchDefaults } from '@/lib/types/common';

export class BatchExecutionService {
  /**
   * Execute a database transaction
   */
  private async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }

  /**
   * Update batch status with optimistic concurrency control
   *
   * @param id - Batch ID
   * @param status - New status
   * @param expectedVersion - Expected version number (for optimistic locking)
   * @returns Updated batch or undefined if version mismatch
   */
  async updateBatchStatus(
    id: string,
    status: 'draft' | 'queued' | 'running' | 'completed' | 'failed',
    expectedVersion?: number
  ): Promise<Batch | undefined> {
    return this.transaction(async (tx) => {
      // Get current batch
      const currentBatch = await tx.query.batches.findFirst({
        where: eq(batches.id, id),
      });

      if (!currentBatch) {
        return undefined;
      }

      // Check version if provided (optimistic concurrency control)
      if (expectedVersion !== undefined && currentBatch.version !== expectedVersion) {
        throw new Error(`Version mismatch: expected ${expectedVersion}, got ${currentBatch.version}`);
      }

      // Update status and optionally set completedAt
      const updateData: Partial<NewBatch> & { updatedAt: Date; completedAt?: Date } = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'completed' || status === 'failed') {
        updateData.completedAt = new Date();
      }

      const [updated] = await tx
        .update(batches)
        .set(updateData)
        .where(eq(batches.id, id))
        .returning();

      return updated;
    });
  }

  /**
   * Create generation records for a batch
   * This prepares the batch for execution by creating generation placeholders
   *
   * @param batchId - Batch ID
   * @returns Array of created generation records
   */
  async createGenerationsForBatch(batchId: string): Promise<Generation[]> {
    return this.transaction(async (tx) => {
      // Get batch with prompts and defaults
      const batch = await tx.query.batches.findFirst({
        where: eq(batches.id, batchId),
        with: {
          batchPrompts: true,
        },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      const generationsData: NewGeneration[] = [];

      // Create generation records for each prompt
      for (const batchPrompt of batch.batchPrompts) {
        const overrides = batchPrompt.overrides as BatchPromptOverrides | null;
        const defaults = batch.defaults as BatchDefaults | null;
        const count = overrides?.count ?? defaults?.count ?? 1;

        // Create multiple generations if count > 1
        for (let i = 0; i < count; i++) {
          generationsData.push({
            batchId: batch.id,
            batchPromptId: batchPrompt.id,
            status: 'pending',
            runNumber: i + 1,
          });
        }
      }

      // Insert all generations atomically
      if (generationsData.length > 0) {
        return tx.insert(generations).values(generationsData).returning();
      }

      return [];
    });
  }

  /**
   * Calculate batch completion status based on generations
   *
   * @param batchId - Batch ID
   * @returns Status summary
   */
  async getBatchCompletionStatus(batchId: string): Promise<{
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
    isComplete: boolean;
    finalStatus: 'completed' | 'failed' | 'running';
  }> {
    const allGenerations = await db.query.generations.findMany({
      where: eq(generations.batchId, batchId),
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
}

// Export singleton instance
export const batchExecutionService = new BatchExecutionService();
