import { AudioProvider, AudioGenerationOptions, AudioGenerationResult } from './types';
import { db } from '@/lib/db';
import { audioGenerations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { audioFilesService } from '@/lib/services';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AudioCraft Provider
 *
 * Communicates with the local AudioCraft Python service to generate audio.
 * The service runs on localhost and uses Meta's AudioGen model.
 */
export class AudioCraftProvider implements AudioProvider {
  readonly name = 'audiocraft';
  private readonly baseUrl: string;
  private readonly outputDir: string;

  constructor() {
    // Get AudioCraft service URL from environment
    this.baseUrl = process.env.AUDIOCRAFT_URL || 'http://127.0.0.1:8001';

    // Output directory for audio files (relative to project root)
    this.outputDir = path.join(process.cwd(), 'public', 'audio', 'generated');

    // Ensure output directory exists
    this.ensureOutputDirectory();
  }

  /**
   * Ensure the output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Test connection to the AudioCraft service
   *
   * @returns true if service is healthy
   * @throws Error if connection fails
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`AudioCraft service health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      throw new Error(`Failed to connect to AudioCraft service at ${this.baseUrl}: ${error}`);
    }
  }

  /**
   * Generate audio from a prompt
   *
   * @param options - Audio generation options
   * @param generationId - Database generation record ID
   * @returns Generation result with file information
   * @throws Error if generation fails
   */
  async generateAudio(
    options: AudioGenerationOptions,
    generationId: string
  ): Promise<AudioGenerationResult> {
    try {
      // Update generation status to 'running'
      await db
        .update(audioGenerations)
        .set({ status: 'running' })
        .where(eq(audioGenerations.id, generationId));

      // Call AudioCraft service
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: options.prompt,
          duration: options.duration ?? 5,
          temperature: options.temperature ?? 1.0,
          top_k: options.topK ?? 250,
          cfg_coef: options.cfgCoef ?? 3.0,
          batch_id: options.audioBatchId ?? generationId,
          generation_id: generationId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AudioCraft generation failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      // Move the generated file to our output directory
      // The Python service returns a relative path from its working directory (audio-gen)
      // We need to construct the absolute path
      const audioGenDir = path.join(process.cwd(), '..', 'audio-gen');
      const sourceFilePath = path.isAbsolute(result.file_path)
        ? result.file_path
        : path.join(audioGenDir, result.file_path);

      const fileName = `${generationId}_${result.file_name}`;
      const destFilePath = path.join(this.outputDir, fileName);

      // Copy file from AudioCraft output to our public directory
      if (fs.existsSync(sourceFilePath)) {
        fs.copyFileSync(sourceFilePath, destFilePath);
      } else {
        throw new Error(`Generated audio file not found at ${sourceFilePath}`);
      }

      // Create relative path for database (relative to public directory)
      const relativeFilePath = `/audio/generated/${fileName}`;

      // Create audio file record in database
      await audioFilesService.createAudioFile({
        audioGenerationId: generationId,
        filePath: relativeFilePath,
        fileName: fileName,
        mediaType: 'audio/mpeg',
        fileSize: result.file_size,
        duration: Math.round(result.duration * 1000), // Convert to milliseconds
        sampleRate: result.sample_rate,
        metadata: {
          prompt: options.prompt,
          temperature: options.temperature,
          topK: options.topK,
          cfgCoef: options.cfgCoef,
        },
      });

      // Update generation status to 'success'
      await db
        .update(audioGenerations)
        .set({
          status: 'success',
          completedAt: new Date(),
          metadata: {
            duration: result.duration,
            sampleRate: result.sample_rate,
            fileSize: result.file_size,
          },
        })
        .where(eq(audioGenerations.id, generationId));

      return {
        filePath: relativeFilePath,
        fileName: fileName,
        duration: Math.round(result.duration * 1000),
        sampleRate: result.sample_rate,
        fileSize: result.file_size,
        mediaType: 'audio/mpeg',
        metadata: result.metadata,
      };
    } catch (error) {
      // Update generation status to 'failed'
      await db
        .update(audioGenerations)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        })
        .where(eq(audioGenerations.id, generationId));

      throw error;
    }
  }
}
