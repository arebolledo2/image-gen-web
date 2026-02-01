/**
 * Service for managing batches with transaction support.
 * Note: Uses `any` for dynamic JSON data and Drizzle ORM operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import { batches, batchPrompts, generations, prompts, subjects, Batch, NewBatch, BatchPrompt, Generation, NewGeneration } from '@/lib/db/schema';
import { eq, desc, inArray, asc, like, or, and, exists } from 'drizzle-orm';
import { BaseService } from './base.service';
import type { BatchPromptOverrides, BatchDefaults } from '@/lib/types/common';

/**
 * Batches group multiple prompts for bulk image generation.
 * This service ensures atomic operations for batch creation and execution.
 */
export class BatchesService extends BaseService<typeof batches, Batch, NewBatch> {
  constructor() {
    super(batches);
  }

  /**
   * Get all batches with their prompts and preview images (paginated)
   *
   * @param options - Pagination and filter options
   * @returns Paginated batches with related data
   */
  async getAllBatchesWithDetails(options: { limit?: number; offset?: number; categoryId?: string; favoritesOnly?: boolean } = {}) {
    const { limit = 10, offset = 0, categoryId, favoritesOnly } = options;

    // Build where conditions
    const conditions = [];

    // Filter by favorite
    if (favoritesOnly) {
      conditions.push(eq(batches.isFavorite, true));
    }

    // Filter by category (subjects linked to prompts in this batch)
    if (categoryId) {
      conditions.push(
        exists(
          db.select()
            .from(batchPrompts)
            .innerJoin(prompts, eq(batchPrompts.promptId, prompts.id))
            .innerJoin(subjects, eq(prompts.subjectId, subjects.id))
            .where(
              and(
                eq(batchPrompts.batchId, batches.id),
                eq(subjects.categoryId, categoryId)
              )
            )
        )
      );
    }

    return db.query.batches.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(batches.createdAt)],
      limit,
      offset,
      with: {
        batchPrompts: {
          columns: {
            id: true,
            promptText: true,
            order: true,
          },
        },
        generations: {
          columns: {
            id: true,
            status: true,
          },
          with: {
            images: {
              columns: {
                id: true,
                fileName: true,
              },
              limit: 3,
            },
          },
          limit: 3,
        },
      },
    });
  }

  /**
   * Count total number of batches
   *
   * @param options - Filter options
   * @returns Total count
   */
  async countBatches(options: { categoryId?: string; favoritesOnly?: boolean } = {}) {
    const { categoryId, favoritesOnly } = options;

    // Build where conditions for counting
    const conditions = [];

    if (favoritesOnly) {
      conditions.push(eq(batches.isFavorite, true));
    }

    if (categoryId) {
      conditions.push(
        exists(
          db.select()
            .from(batchPrompts)
            .innerJoin(prompts, eq(batchPrompts.promptId, prompts.id))
            .innerJoin(subjects, eq(prompts.subjectId, subjects.id))
            .where(
              and(
                eq(batchPrompts.batchId, batches.id),
                eq(subjects.categoryId, categoryId)
              )
            )
        )
      );
    }

    if (conditions.length > 0) {
      const result = await db.select()
        .from(batches)
        .where(and(...conditions));
      return result.length;
    }

    return db.$count(batches);
  }

  /**
   * Get batches with optional filtering and search
   * Designed for external tools (Claude skills, API consumers)
   *
   * @param options - Query options
   * @returns Batches matching the criteria
   */
  async getBatches(options: {
    search?: string;
    status?: 'draft' | 'queued' | 'running' | 'completed' | 'failed';
    includeImageCount?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    const { search, status, includeImageCount = false, limit = 20, offset = 0 } = options;

    // Build where conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(batches.status, status));
    }

    if (search) {
      // Search in name and description
      conditions.push(
        or(
          like(batches.name, `%${search}%`),
          like(batches.description, `%${search}%`)
        )!
      );
    }

    // Build base query
    const query = db.query.batches.findMany({
      where: conditions.length > 0 ? conditions[0] : undefined,
      orderBy: [desc(batches.createdAt)],
      limit,
      offset,
      with: {
        batchPrompts: {
          columns: {
            id: true,
            promptText: true,
          },
        },
      },
    });

    let result = await query;

    // If includeImageCount, fetch image counts for each batch
    if (includeImageCount) {
      const batchIds = result.map(b => b.id);

      if (batchIds.length > 0) {
        // Get generation counts per batch
        const generationsData = await db.query.generations.findMany({
          where: inArray(generations.batchId, batchIds),
          with: {
            images: {
              columns: {
                id: true,
              },
            },
          },
        });

        // Build image count map
        const imageCountMap = new Map<string, number>();
        for (const gen of generationsData) {
          const batchId = gen.batchId;
          const currentCount = imageCountMap.get(batchId) || 0;
          imageCountMap.set(batchId, currentCount + gen.images.length);
        }

        // Add imageCount to results
        result = result.map(batch => ({
          ...batch,
          imageCount: imageCountMap.get(batch.id) || 0,
        }));
      }
    }

    return result;
  }

  /**
   * Get a batch by ID with all related data
   *
   * @param id - Batch ID
   * @returns Batch with prompts, generations, and lineage
   */
  async getBatchWithDetails(id: string) {
    return db.query.batches.findFirst({
      where: eq(batches.id, id),
      with: {
        parentBatch: true,
        childBatches: {
          orderBy: [desc(batches.version)],
        },
        batchPrompts: {
          with: {
            prompt: {
              with: {
                style: true,
                subject: true,
                promptGuidance: {
                  with: {
                    guidance: true,
                  },
                },
              },
            },
          },
          orderBy: [asc(batchPrompts.order)],
        },
        generations: {
          with: {
            images: true,
          },
        },
      },
    });
  }

  /**
   * Create a new batch with prompts atomically
   *
   * @param data - Batch data with prompts
   * @returns Created batch with all relations
   */
  async createBatch(data: {
    name: string;
    description?: string;
    provider?: 'gemini' | 'gemini3' | 'comfyui';
    defaults?: {
      aspectRatio?: string;
      imageSize?: string;
      count?: number;
      resolution?: string;
    };
    prompts: Array<{
      promptId?: string;
      promptText: string;
      overrides?: {
        count?: number;
        aspectRatio?: string;
        imageSize?: string;
        resolution?: string;
      };
    }>;
  }) {
    return this.transaction(async (tx) => {
      // Validate that we have at least one prompt
      if (!data.prompts || data.prompts.length === 0) {
        throw new Error('At least one prompt is required');
      }

      // Create the batch
      const [batch] = await tx
        .insert(batches)
        .values({
          name: data.name,
          description: data.description,
          provider: data.provider || 'gemini',
          status: 'draft',
          defaults: data.defaults || {},
          version: 1,
        })
        .returning();

      // Create batch prompts
      const batchPromptsData = data.prompts.map((prompt, index) => ({
        batchId: batch.id,
        promptId: prompt.promptId || null,
        promptText: prompt.promptText,
        overrides: prompt.overrides || {},
        order: index,
      }));

      await tx.insert(batchPrompts).values(batchPromptsData);

      // Return complete batch with relations
      return tx.query.batches.findFirst({
        where: eq(batches.id, batch.id),
        with: {
          batchPrompts: {
            with: {
              prompt: {
                with: {
                  style: true,
                  subject: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Create a new version of an existing batch
   *
   * @param parentBatchId - ID of the parent batch
   * @param data - Updated batch data
   * @returns Created batch version
   */
  async createBatchVersion(
    parentBatchId: string,
    data: {
      name?: string;
      description?: string;
      provider?: 'gemini' | 'gemini3' | 'comfyui';
      defaults?: Partial<BatchDefaults>;
      prompts?: Array<{
        promptId?: string;
        promptText: string;
        overrides?: BatchPromptOverrides;
      }>;
    }
  ) {
    return this.transaction(async (tx) => {
      // Get parent batch
      const parentBatch = await tx.query.batches.findFirst({
        where: eq(batches.id, parentBatchId),
        with: {
          batchPrompts: true,
        },
      });

      if (!parentBatch) {
        throw new Error(`Parent batch ${parentBatchId} not found`);
      }

      // Merge parent defaults with new defaults
      const mergedDefaults = {
        ...(parentBatch.defaults as BatchDefaults || {}),
        ...(data.defaults || {}),
      };

      // Create new version
      const [batch] = await tx
        .insert(batches)
        .values({
          name: data.name ?? parentBatch.name,
          description: data.description ?? parentBatch.description,
          provider: data.provider ?? parentBatch.provider,
          status: 'draft',
          defaults: mergedDefaults,
          parentBatchId,
          version: parentBatch.version + 1,
        })
        .returning();

      // Copy or use new prompts
      const promptsToUse = data.prompts || parentBatch.batchPrompts.map((bp: BatchPrompt) => ({
        promptId: bp.promptId || undefined,
        promptText: bp.promptText,
        overrides: bp.overrides,
      }));

      const batchPromptsData = promptsToUse.map((prompt: { promptId?: string; promptText: string; overrides?: BatchPromptOverrides }, index: number) => ({
        batchId: batch.id,
        promptId: prompt.promptId || null,
        promptText: prompt.promptText,
        overrides: prompt.overrides || {},
        order: index,
      }));

      await tx.insert(batchPrompts).values(batchPromptsData);

      return tx.query.batches.findFirst({
        where: eq(batches.id, batch.id),
        with: {
          batchPrompts: true,
        },
      });
    });
  }

  /**
   * Update batch metadata (not prompts)
   *
   * @param id - Batch ID
   * @param data - Updated batch data
   * @returns Updated batch
   */
  async updateBatch(
    id: string,
    data: {
      name?: string;
      description?: string;
      provider?: 'gemini' | 'gemini3' | 'comfyui';
      defaults?: Partial<BatchDefaults>;
    }
  ): Promise<Batch | undefined> {
    return this.update(id, data);
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

  /**
   * Delete a batch and all related data
   * WARNING: This will cascade delete prompts, generations, and images
   *
   * @param id - Batch ID
   * @returns true if deleted
   */
  async deleteBatch(id: string): Promise<boolean> {
    return this.transaction(async (tx) => {
      // Get batch to find all related records
      const batch = await tx.query.batches.findFirst({
        where: eq(batches.id, id),
        with: {
          batchPrompts: true,
          generations: {
            with: {
              images: true,
            },
          },
        },
      });

      if (!batch) {
        return false;
      }

      // Note: With proper foreign key constraints, this would cascade automatically
      // For now, we need to manually delete in the correct order

      // Delete images first (leaf nodes)
      const imageIds = batch.generations.flatMap((g: any) => g.images.map((i: any) => i.id));
      if (imageIds.length > 0) {
        const { images } = await import('@/lib/db/schema');
        await tx.delete(images).where(inArray(images.id, imageIds));
      }

      // Delete generations
      const generationIds = batch.generations.map((g: any) => g.id);
      if (generationIds.length > 0) {
        await tx.delete(generations).where(inArray(generations.id, generationIds));
      }

      // Delete batch prompts
      await tx.delete(batchPrompts).where(eq(batchPrompts.batchId, id));

      // Delete batch
      await tx.delete(batches).where(eq(batches.id, id));

      return true;
    });
  }

  /**
   * Toggle favorite status for a batch
   *
   * @param id - Batch ID
   * @returns Updated batch
   */
  async toggleFavorite(id: string): Promise<Batch | undefined> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error(`Batch ${id} not found`);
    }

    return this.update(id, { isFavorite: !batch.isFavorite });
  }
}

// Export singleton instance
export const batchesService = new BatchesService();
