import { db } from '@/lib/db';
import { images, squishAnimations, imageEdits, Image, NewImage, SquishAnimation, ImageEdit, generations } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing images and their transformations.
 *
 * Handles image metadata, favorites, transformations (transparent, flipped),
 * squish animations, and AI edits.
 */
export class ImagesService extends BaseService<typeof images, Image, NewImage> {
  constructor() {
    super(images);
  }

  /**
   * Get an image by ID with all related data
   *
   * @param id - Image ID
   * @returns Image with generation, batch, and transformations
   */
  async getImageWithDetails(id: string) {
    return db.query.images.findFirst({
      where: eq(images.id, id),
      with: {
        generation: {
          with: {
            batch: true,
            batchPrompt: {
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
        },
        squishAnimations: {
          orderBy: [desc(squishAnimations.createdAt)],
        },
        imageEdits: {
          orderBy: [desc(imageEdits.createdAt)],
        },
      },
    });
  }

  /**
   * Get all images for a specific batch
   *
   * @param batchId - Batch ID
   * @param options - Query options
   * @returns Images from the batch
   */
  async getImagesByBatch(
    batchId: string,
    options?: {
      favoritesOnly?: boolean;
      limit?: number;
    }
  ) {
    // First get all generations for this batch
    const batchGenerations = await db.query.generations.findMany({
      where: eq(generations.batchId, batchId),
    });

    const generationIds = batchGenerations.map(g => g.id);

    if (generationIds.length === 0) {
      return [];
    }

    // Build query
    const query = db.query.images.findMany({
      where: inArray(images.generationId, generationIds),
      orderBy: [desc(images.createdAt)],
      with: {
        generation: {
          with: {
            batchPrompt: true,
          },
        },
        squishAnimations: true,
        imageEdits: true,
      },
    });

    let result = await query;

    // Apply filters
    if (options?.favoritesOnly) {
      result = result.filter(img => img.isFavorite);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get all favorite images
   *
   * @param limit - Optional limit
   * @returns Favorite images
   */
  async getFavoriteImages(limit?: number) {
    return db.query.images.findMany({
      where: eq(images.isFavorite, true),
      orderBy: [desc(images.createdAt)],
      limit,
      with: {
        generation: {
          with: {
            batch: true,
          },
        },
      },
    });
  }

  /**
   * Create a new image record
   *
   * @param data - Image data
   * @returns Created image
   */
  async createImage(data: {
    generationId: string;
    filePath: string;
    fileName: string;
    mediaType: string;
    fileSize?: number;
    metadata?: Record<string, any>;
  }): Promise<Image> {
    return this.create({
      generationId: data.generationId,
      filePath: data.filePath,
      fileName: data.fileName,
      mediaType: data.mediaType,
      fileSize: data.fileSize,
      metadata: data.metadata,
      isFavorite: false,
    });
  }

  /**
   * Toggle favorite status
   *
   * @param id - Image ID
   * @param isFavorite - New favorite status
   * @returns Updated image
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<Image | undefined> {
    return this.update(id, { isFavorite });
  }

  /**
   * Update image file paths (for transformations)
   *
   * @param id - Image ID
   * @param data - File path updates
   * @returns Updated image
   */
  async updateImagePaths(
    id: string,
    data: {
      transparentFilePath?: string;
      flippedFilePath?: string;
    }
  ): Promise<Image | undefined> {
    return this.update(id, data);
  }

  /**
   * Create a squish animation for an image
   *
   * @param data - Animation data
   * @returns Created animation
   */
  async createSquishAnimation(data: {
    imageId: string;
    spritesheetPath: string;
    frameCount: number;
    intensity: number;
    animationType?: 'bounce' | 'squash_stretch';
    generatedBy?: 'manual' | 'ai';
    aiPrompt?: string;
    fullAiPrompt?: string;
    metadata?: {
      width?: number;
      height?: number;
      frameWidth?: number;
      frameHeight?: number;
      duration?: number;
      gridSize?: number;
    };
  }): Promise<SquishAnimation> {
    const [animation] = await db
      .insert(squishAnimations)
      .values({
        imageId: data.imageId,
        spritesheetPath: data.spritesheetPath,
        frameCount: data.frameCount,
        intensity: data.intensity,
        animationType: data.animationType || 'bounce',
        generatedBy: data.generatedBy || 'manual',
        aiPrompt: data.aiPrompt,
        fullAiPrompt: data.fullAiPrompt,
        metadata: data.metadata,
      })
      .returning();

    return animation;
  }

  /**
   * Get all squish animations for an image
   *
   * @param imageId - Image ID
   * @returns Squish animations
   */
  async getSquishAnimationsByImage(imageId: string): Promise<SquishAnimation[]> {
    return db.query.squishAnimations.findMany({
      where: eq(squishAnimations.imageId, imageId),
      orderBy: [desc(squishAnimations.createdAt)],
    });
  }

  /**
   * Delete a squish animation
   *
   * @param id - Animation ID
   * @returns true if deleted
   */
  async deleteSquishAnimation(id: string): Promise<boolean> {
    const result = await db.delete(squishAnimations).where(eq(squishAnimations.id, id));
    return (result as any).rowCount > 0;
  }

  /**
   * Create an AI edit for an image
   *
   * @param data - Edit data
   * @returns Created edit
   */
  async createImageEdit(data: {
    imageId: string;
    sourceVersion: string;
    editedFilePath: string;
    transparentEditPath?: string;
    userPrompt: string;
    fullAiPrompt: string;
    generatedName: string;
    metadata?: {
      width?: number;
      height?: number;
      sourceFilePath?: string;
      [key: string]: any;
    };
  }): Promise<ImageEdit> {
    const [edit] = await db
      .insert(imageEdits)
      .values({
        imageId: data.imageId,
        sourceVersion: data.sourceVersion,
        editedFilePath: data.editedFilePath,
        transparentEditPath: data.transparentEditPath,
        userPrompt: data.userPrompt,
        fullAiPrompt: data.fullAiPrompt,
        generatedName: data.generatedName,
        metadata: data.metadata,
      })
      .returning();

    return edit;
  }

  /**
   * Get all edits for an image
   *
   * @param imageId - Image ID
   * @returns Image edits
   */
  async getImageEditsByImage(imageId: string): Promise<ImageEdit[]> {
    return db.query.imageEdits.findMany({
      where: eq(imageEdits.imageId, imageId),
      orderBy: [desc(imageEdits.createdAt)],
    });
  }

  /**
   * Delete an image edit
   *
   * @param id - Edit ID
   * @returns true if deleted
   */
  async deleteImageEdit(id: string): Promise<boolean> {
    const result = await db.delete(imageEdits).where(eq(imageEdits.id, id));
    return (result as any).rowCount > 0;
  }

  /**
   * Delete an image and all its transformations
   *
   * @param id - Image ID
   * @returns true if deleted
   */
  async deleteImageWithTransformations(id: string): Promise<boolean> {
    return this.transaction(async (tx) => {
      // Delete squish animations
      await tx.delete(squishAnimations).where(eq(squishAnimations.imageId, id));

      // Delete image edits
      await tx.delete(imageEdits).where(eq(imageEdits.imageId, id));

      // Delete image
      const result = await tx.delete(images).where(eq(images.id, id));

      return (result as any).rowCount > 0;
    });
  }

  /**
   * Get image statistics for a batch
   *
   * @param batchId - Batch ID
   * @returns Statistics
   */
  async getImageStatistics(batchId: string): Promise<{
    total: number;
    favorites: number;
    withTransparent: number;
    withFlipped: number;
    withAnimations: number;
    withEdits: number;
  }> {
    const batchImages = await this.getImagesByBatch(batchId);

    return {
      total: batchImages.length,
      favorites: batchImages.filter(img => img.isFavorite).length,
      withTransparent: batchImages.filter(img => img.transparentFilePath).length,
      withFlipped: batchImages.filter(img => img.flippedFilePath).length,
      withAnimations: batchImages.filter(img => img.squishAnimations.length > 0).length,
      withEdits: batchImages.filter(img => img.imageEdits.length > 0).length,
    };
  }
}

// Export singleton instance
export const imagesService = new ImagesService();
