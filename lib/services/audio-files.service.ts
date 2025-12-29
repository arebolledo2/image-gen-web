import { db } from '@/lib/db';
import { audioFiles, AudioFile, NewAudioFile, audioGenerations } from '@/lib/db/schema';
import { eq, desc, and, inArray, like } from 'drizzle-orm';
import { BaseService } from './base.service';

/**
 * Service for managing audio files and their metadata.
 *
 * Handles audio file metadata, favorites, and filtering.
 */
export class AudioFilesService extends BaseService<typeof audioFiles, AudioFile, NewAudioFile> {
  constructor() {
    super(audioFiles);
  }

  /**
   * Get an audio file by ID with all related data
   *
   * @param id - Audio File ID
   * @returns Audio file with generation, batch, and prompt context
   */
  async getAudioFileWithDetails(id: string) {
    return db.query.audioFiles.findFirst({
      where: eq(audioFiles.id, id),
      with: {
        audioGeneration: {
          with: {
            audioBatch: true,
            audioBatchPrompt: true,
          },
        },
      },
    });
  }

  /**
   * Get all audio files for a specific batch
   *
   * @param audioBatchId - Audio Batch ID
   * @param options - Query options
   * @returns Audio files from the batch
   */
  async getAudioFilesByBatch(
    audioBatchId: string,
    options?: {
      favoritesOnly?: boolean;
      limit?: number;
    }
  ) {
    // First get all generations for this batch
    const batchGenerations = await db.query.audioGenerations.findMany({
      where: eq(audioGenerations.audioBatchId, audioBatchId),
    });

    const generationIds = batchGenerations.map(g => g.id);

    if (generationIds.length === 0) {
      return [];
    }

    // Build query
    let query = db.query.audioFiles.findMany({
      where: inArray(audioFiles.audioGenerationId, generationIds),
      orderBy: [desc(audioFiles.createdAt)],
      with: {
        audioGeneration: {
          with: {
            audioBatch: true,
            audioBatchPrompt: true,
          },
        },
      },
    });

    let result = await query;

    // Apply filters
    if (options?.favoritesOnly) {
      result = result.filter(file => file.isFavorite);
    }

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get all favorite audio files
   *
   * @param limit - Optional limit
   * @returns Favorite audio files
   */
  async getFavoriteAudioFiles(limit?: number) {
    return db.query.audioFiles.findMany({
      where: eq(audioFiles.isFavorite, true),
      orderBy: [desc(audioFiles.createdAt)],
      limit,
      with: {
        audioGeneration: {
          with: {
            audioBatch: true,
            audioBatchPrompt: true,
          },
        },
      },
    });
  }

  /**
   * Get all audio files with optional filtering
   *
   * @param options - Query options
   * @returns Audio files matching criteria
   */
  async getAllAudioFiles(options?: {
    favoritesOnly?: boolean;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }) {
    // Build base query
    let query = db.query.audioFiles.findMany({
      orderBy: [desc(audioFiles.createdAt)],
      with: {
        audioGeneration: {
          with: {
            audioBatch: true,
            audioBatchPrompt: true,
          },
        },
      },
      limit: options?.limit,
      offset: options?.offset,
    });

    let result = await query;

    // Apply filters
    if (options?.favoritesOnly) {
      result = result.filter(file => file.isFavorite);
    }

    if (options?.searchQuery) {
      const searchLower = options.searchQuery.toLowerCase();
      result = result.filter(file =>
        file.fileName.toLowerCase().includes(searchLower) ||
        file.audioGeneration?.audioBatchPrompt?.promptText.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }

  /**
   * Create a new audio file record
   *
   * @param data - Audio file data
   * @returns Created audio file
   */
  async createAudioFile(data: {
    audioGenerationId: string;
    filePath: string;
    fileName: string;
    mediaType: string;
    fileSize?: number;
    duration?: number;
    sampleRate?: number;
    metadata?: Record<string, any>;
  }): Promise<AudioFile> {
    return this.create({
      audioGenerationId: data.audioGenerationId,
      filePath: data.filePath,
      fileName: data.fileName,
      mediaType: data.mediaType,
      fileSize: data.fileSize,
      duration: data.duration,
      sampleRate: data.sampleRate,
      metadata: data.metadata,
      isFavorite: false,
    });
  }

  /**
   * Toggle favorite status
   *
   * @param id - Audio File ID
   * @param isFavorite - New favorite status
   * @returns Updated audio file
   */
  async toggleFavorite(id: string, isFavorite: boolean): Promise<AudioFile | undefined> {
    return this.update(id, { isFavorite });
  }

  /**
   * Delete an audio file
   *
   * @param id - Audio File ID
   * @returns true if deleted
   */
  async deleteAudioFile(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Get audio file statistics for a batch
   *
   * @param audioBatchId - Audio Batch ID
   * @returns Statistics
   */
  async getAudioFileStatistics(audioBatchId: string): Promise<{
    total: number;
    favorites: number;
    totalDuration: number; // in milliseconds
    averageDuration: number; // in milliseconds
    totalSize: number; // in bytes
  }> {
    const batchAudioFiles = await this.getAudioFilesByBatch(audioBatchId);

    const totalDuration = batchAudioFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
    const totalSize = batchAudioFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    return {
      total: batchAudioFiles.length,
      favorites: batchAudioFiles.filter(file => file.isFavorite).length,
      totalDuration,
      averageDuration: batchAudioFiles.length > 0 ? totalDuration / batchAudioFiles.length : 0,
      totalSize,
    };
  }
}

// Export singleton instance
export const audioFilesService = new AudioFilesService();
