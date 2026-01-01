import { db } from '@/lib/db';
import { prompts, promptGuidance, Prompt, NewPrompt } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing prompts and their guidance associations.
 *
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
      // Delete the guidance associations
      await tx
        .delete(promptGuidance)
        .where(
          eq(promptGuidance.promptId, promptId)
        );

      // Re-query to get specific associations to delete
      const toDelete = await tx.query.promptGuidance.findMany({
        where: eq(promptGuidance.promptId, promptId),
      });

      const idsToDelete = toDelete
        .filter((pg: any) => guidanceIds.includes(pg.guidanceId))
        .map((pg: any) => pg.id);

      if (idsToDelete.length > 0) {
        await tx
          .delete(promptGuidance)
          .where(inArray(promptGuidance.id, idsToDelete));
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
}

// Export singleton instance
export const promptsService = new PromptsService();
