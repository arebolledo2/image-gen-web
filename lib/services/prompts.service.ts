/**
 * Service for managing prompts and their guidance associations.
 * Note: Uses `any` for dynamic JSON data and Drizzle ORM operations.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db';
import {
  prompts, promptGuidance, subjects, styles, guidance, images, generations, batchPrompts,
  Prompt, NewPrompt,
} from '@/lib/db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { BaseService } from './base.service';
import { notFound } from '@/lib/api/errors';

/**
 * Prompts combine a style, subject, and optional guidance modifiers
 * to create complete AI image generation prompts.
 */
export class PromptsService extends BaseService<typeof prompts, Prompt, NewPrompt> {
  constructor() {
    super(prompts);
  }

  /**
   * Get a prompt by ID with all its related data
   *
   * @param id - Prompt ID
   * @returns Prompt with style, subject, and guidance
   */
  async getPromptWithRelations(id: string) {
    return db.query.prompts.findFirst({
      where: eq(prompts.id, id),
      with: {
        style: true,
        subject: true,
        promptGuidance: {
          with: {
            guidance: true,
          },
        },
      },
    });
  }

  /**
   * Get all prompts with their related data
   *
   * @returns All prompts with style, subject, and guidance
   */
  async getAllPromptsWithRelations() {
    return db.query.prompts.findMany({
      orderBy: [desc(prompts.createdAt)],
      with: {
        style: true,
        subject: true,
        promptGuidance: {
          with: {
            guidance: true,
          },
        },
      },
    });
  }

  /**
   * Create a new prompt with guidance associations
   *
   * @param data - Prompt data with optional guidance IDs
   * @returns Created prompt with all relations
   */
  async createPrompt(data: {
    name: string;
    styleId: string;
    subjectId: string;
    guidanceIds?: string[];
    promptText?: string;
  }) {
    return this.transaction(async (tx) => {
      // Create the prompt
      const [prompt] = await tx
        .insert(prompts)
        .values({
          name: data.name,
          styleId: data.styleId,
          subjectId: data.subjectId,
          promptText: data.promptText,
        })
        .returning();

      // Associate guidance if provided
      if (data.guidanceIds && data.guidanceIds.length > 0) {
        const guidanceData = data.guidanceIds.map(guidanceId => ({
          promptId: prompt.id,
          guidanceId,
        }));

        await tx.insert(promptGuidance).values(guidanceData);
      }

      // Return prompt with relations
      return tx.query.prompts.findFirst({
        where: eq(prompts.id, prompt.id),
        with: {
          style: true,
          subject: true,
          promptGuidance: {
            with: {
              guidance: true,
            },
          },
        },
      });
    });
  }

  /**
   * Update a prompt (only name and cached promptText can be updated)
   *
   * @param id - Prompt ID
   * @param data - Updated prompt data
   * @returns Updated prompt
   */
  async updatePrompt(
    id: string,
    data: {
      name?: string;
      promptText?: string;
    }
  ): Promise<Prompt | undefined> {
    return this.update(id, data);
  }

  /**
   * Add guidance to a prompt
   *
   * @param promptId - Prompt ID
   * @param guidanceIds - Array of guidance IDs to add
   * @returns Updated prompt with relations
   */
  async addGuidanceToPrompt(promptId: string, guidanceIds: string[]) {
    return this.transaction(async (tx) => {
      // Get existing guidance associations
      const existing = await tx.query.promptGuidance.findMany({
        where: eq(promptGuidance.promptId, promptId),
      });

      const existingGuidanceIds = new Set(existing.map((pg: any) => pg.guidanceId));

      // Filter out already associated guidance
      const newGuidanceIds = guidanceIds.filter(id => !existingGuidanceIds.has(id));

      if (newGuidanceIds.length > 0) {
        const guidanceData = newGuidanceIds.map(guidanceId => ({
          promptId,
          guidanceId,
        }));

        await tx.insert(promptGuidance).values(guidanceData);
      }

      // Return updated prompt with relations
      return tx.query.prompts.findFirst({
        where: eq(prompts.id, promptId),
        with: {
          style: true,
          subject: true,
          promptGuidance: {
            with: {
              guidance: true,
            },
          },
        },
      });
    });
  }

  /**
   * Remove guidance from a prompt
   *
   * @param promptId - Prompt ID
   * @param guidanceIds - Array of guidance IDs to remove
   * @returns Updated prompt with relations
   */
  async removeGuidanceFromPrompt(promptId: string, guidanceIds: string[]) {
    return this.transaction(async (tx) => {
      // Delete ONLY the specified guidance associations
      await tx
        .delete(promptGuidance)
        .where(
          and(
            eq(promptGuidance.promptId, promptId),
            inArray(promptGuidance.guidanceId, guidanceIds)
          )
        );

      // Return updated prompt with remaining guidance
      return tx.query.prompts.findFirst({
        where: eq(prompts.id, promptId),
        with: {
          style: true,
          subject: true,
          promptGuidance: {
            with: {
              guidance: true,
            },
          },
        },
      });
    });
  }

  /**
   * Get all prompts that use a specific style
   *
   * @param styleId - Style ID
   * @returns Prompts using this style
   */
  async getPromptsByStyle(styleId: string) {
    return db.query.prompts.findMany({
      where: eq(prompts.styleId, styleId),
      with: {
        style: true,
        subject: true,
        promptGuidance: {
          with: {
            guidance: true,
          },
        },
      },
    });
  }

  /**
   * Get all prompts that use a specific subject
   *
   * @param subjectId - Subject ID
   * @returns Prompts using this subject
   */
  async getPromptsBySubject(subjectId: string) {
    return db.query.prompts.findMany({
      where: eq(prompts.subjectId, subjectId),
      with: {
        style: true,
        subject: true,
        promptGuidance: {
          with: {
            guidance: true,
          },
        },
      },
    });
  }

  /**
   * Delete a prompt and its guidance associations
   *
   * @param id - Prompt ID
   * @returns true if deleted, false if not found
   */
  async deletePrompt(id: string): Promise<boolean> {
    return this.transaction(async (tx) => {
      // Delete guidance associations first
      await tx.delete(promptGuidance).where(eq(promptGuidance.promptId, id));

      // Delete the prompt
      const result = await tx.delete(prompts).where(eq(prompts.id, id));

      return (result as any).rowCount > 0;
    });
  }

  /**
   * Load the subject, optional style and guidance a prompt is composed from.
   *
   * @throws ApiError 404 when the subject or style does not exist
   */
  async loadCompositionInputs(ids: { subjectId: string; styleId?: string | null; guidanceIds?: string[] }) {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, ids.subjectId));
    if (!subject) throw notFound('Subject');

    let style = null;
    if (ids.styleId) {
      [style] = await db.select().from(styles).where(eq(styles.id, ids.styleId));
      if (!style) throw notFound('Style');
    }

    const guidanceRows = ids.guidanceIds && ids.guidanceIds.length > 0
      ? await db.select().from(guidance).where(inArray(guidance.id, ids.guidanceIds))
      : [];

    return { subject, style, guidance: guidanceRows };
  }

  /**
   * Save an AI-composed prompt and link its guidance.
   *
   * `styleId` may be null when a prompt is composed without a style; the column is declared
   * not-null in the schema, so that case keeps relying on the database default behaviour.
   */
  async saveComposedPrompt(data: {
    name: string;
    styleId: string | null;
    subjectId: string;
    promptText: string;
    guidanceIds?: string[];
  }): Promise<Prompt> {
    return this.transaction(async (tx) => {
      const [prompt] = await tx
        .insert(prompts)
        .values({
          name: data.name,
          styleId: data.styleId as string,
          subjectId: data.subjectId,
          promptText: data.promptText,
        })
        .returning();

      if (data.guidanceIds && data.guidanceIds.length > 0) {
        await tx.insert(promptGuidance).values(
          data.guidanceIds.map(guidanceId => ({ promptId: prompt.id, guidanceId }))
        );
      }

      return prompt;
    });
  }

  /**
   * Prompt texts of the batch prompts that generated the given images, used as AI reference.
   */
  async getReferencePromptTexts(imageIds: string[]): Promise<string[]> {
    if (imageIds.length === 0) return [];

    const rows = await db
      .select({ promptText: batchPrompts.promptText })
      .from(images)
      .innerJoin(generations, eq(images.generationId, generations.id))
      .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
      .where(inArray(images.id, imageIds));

    return rows.map(row => row.promptText);
  }
}

// Export singleton instance
export const promptsService = new PromptsService();
