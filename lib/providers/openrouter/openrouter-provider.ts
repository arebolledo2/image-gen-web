import { ImageProvider, GenerationOptions, GenerationResult } from '../types';
import { db } from '@/lib/db';
import { generations, images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveImage } from '@/lib/storage/local-storage';
import { DEFAULT_RESOLUTION, getResolutionPreset } from '@/lib/config/resolution-presets';
import {
  generateOpenRouterImage,
  OPENROUTER_IMAGE_MODEL,
  testOpenRouterImageConnection,
  type OpenRouterAspectRatio,
  type OpenRouterImageConfig,
  type OpenRouterImageSize,
} from './openrouter-image-client';

const DEFAULT_OPENROUTER_IMAGE_CONFIG: OpenRouterImageConfig = {
  aspectRatio: '1:1',
  imageSize: '1K',
};

export function getOpenRouterImageConfig(resolution?: string): OpenRouterImageConfig {
  const preset = getResolutionPreset(resolution || DEFAULT_RESOLUTION);

  if (!preset) {
    return DEFAULT_OPENROUTER_IMAGE_CONFIG;
  }

  return {
    aspectRatio: preset.aspectRatio as OpenRouterAspectRatio,
    imageSize: preset.geminiImageSize as OpenRouterImageSize,
  };
}

export class OpenRouterProvider implements ImageProvider {
  name = 'openrouter' as const;

  async testConnection(): Promise<boolean> {
    return testOpenRouterImageConnection();
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    const { prompt, batchId, generationId, parameters = {} } = options;

    await db.update(generations)
      .set({ status: 'running' })
      .where(eq(generations.id, generationId));

    try {
      const imageConfig = getOpenRouterImageConfig(parameters.resolution);
      const generated = await generateOpenRouterImage({ prompt, imageConfig });

      const imageRecords = [];

      for (const image of generated.images) {
        const uint8Array = new Uint8Array(image.buffer);
        const filePath = await saveImage(
          { uint8Array, mediaType: image.mediaType },
          batchId,
          generationId
        );

        const [imageRecord] = await db.insert(images).values({
          generationId,
          filePath,
          fileName: filePath.split('/').pop() || 'unknown',
          mediaType: image.mediaType,
          fileSize: uint8Array.length,
          metadata: {
            prompt,
            runNumber: options.runNumber,
            model: generated.model || OPENROUTER_IMAGE_MODEL,
            imageConfig,
            assistantContent: generated.content,
            usage: generated.usage,
          },
        }).returning();

        imageRecords.push(imageRecord);
      }

      await db.update(generations)
        .set({
          status: 'success',
          metadata: {
            provider: 'openrouter',
            model: generated.model || OPENROUTER_IMAGE_MODEL,
            imageConfig,
            imageCount: imageRecords.length,
            usage: generated.usage,
          },
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      return {
        generationId,
        images: imageRecords.map((imageRecord) => ({
          id: imageRecord.id,
          filePath: imageRecord.filePath,
          fileName: imageRecord.fileName,
          mediaType: imageRecord.mediaType,
          fileSize: imageRecord.fileSize || undefined,
        })),
        metadata: {
          provider: 'openrouter',
          model: generated.model || OPENROUTER_IMAGE_MODEL,
          imageConfig,
          imageCount: imageRecords.length,
        },
      };
    } catch (error) {
      console.error('OpenRouter image generation failed:', error);
      await db.update(generations)
        .set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      throw error;
    }
  }
}
