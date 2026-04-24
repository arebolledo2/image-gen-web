import { ImageProvider, GenerationOptions, GenerationResult } from '../types';
import { db } from '@/lib/db';
import { generations, images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveImage } from '@/lib/storage/local-storage';
import { DEFAULT_RESOLUTION, getResolutionPreset } from '@/lib/config/resolution-presets';
import {
  generateOpenAIImage,
  OPENAI_IMAGE_MODEL,
  testOpenAIImageConnection,
  type OpenAIImageSize,
} from './openai-image-client';

const DEFAULT_OPENAI_SIZE: OpenAIImageSize = '1024x1024';

export function getOpenAIImageSize(resolution?: string): OpenAIImageSize {
  const preset = getResolutionPreset(resolution || DEFAULT_RESOLUTION);
  const size = preset?.id;

  if (size === '1024x1024' || size === '1024x1536' || size === '1536x1024') {
    return size;
  }

  return DEFAULT_OPENAI_SIZE;
}

export class OpenAIProvider implements ImageProvider {
  name = 'openai' as const;

  async testConnection(): Promise<boolean> {
    return testOpenAIImageConnection();
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    const { prompt, batchId, generationId, parameters = {} } = options;

    await db.update(generations)
      .set({ status: 'running' })
      .where(eq(generations.id, generationId));

    try {
      const size = getOpenAIImageSize(parameters.resolution);
      const generated = await generateOpenAIImage({ prompt, size });
      const uint8Array = new Uint8Array(generated.buffer);

      const filePath = await saveImage(
        { uint8Array, mediaType: generated.mediaType },
        batchId,
        generationId
      );

      const [imageRecord] = await db.insert(images).values({
        generationId,
        filePath,
        fileName: filePath.split('/').pop() || 'unknown',
        mediaType: generated.mediaType,
        fileSize: uint8Array.length,
        metadata: {
          prompt,
          runNumber: options.runNumber,
          model: OPENAI_IMAGE_MODEL,
          size,
          revisedPrompt: generated.revisedPrompt,
          usage: generated.usage,
        },
      }).returning();

      await db.update(generations)
        .set({
          status: 'success',
          metadata: {
            provider: 'openai',
            model: OPENAI_IMAGE_MODEL,
            size,
            imageCount: 1,
            usage: generated.usage,
          },
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      return {
        generationId,
        images: [{
          id: imageRecord.id,
          filePath: imageRecord.filePath,
          fileName: imageRecord.fileName,
          mediaType: imageRecord.mediaType,
          fileSize: imageRecord.fileSize || undefined,
        }],
        metadata: {
          provider: 'openai',
          model: OPENAI_IMAGE_MODEL,
          size,
          imageCount: 1,
        },
      };
    } catch (error) {
      console.error('OpenAI image generation failed:', error);
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
