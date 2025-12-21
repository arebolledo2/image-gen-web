import { ImageProvider, GenerationOptions, GenerationResult } from '../types';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { generations, images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveImage } from '@/lib/storage/local-storage';

export class GeminiProvider implements ImageProvider {
  name: 'gemini' = 'gemini';

  async testConnection(): Promise<boolean> {
    // Gemini API is always available if API key is set
    return true;
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    const { prompt, batchId, generationId, parameters = {} } = options;

    // Update generation to running
    await db.update(generations)
      .set({ status: 'running' })
      .where(eq(generations.id, generationId));

    try {
      // Extract imageConfig from parameters
      const { imageConfig, ...otherParams } = parameters;

      // Build provider options
      const providerOptions: any = {};
      if (imageConfig) {
        providerOptions.imageConfig = imageConfig;
      }

      // Call Gemini with imageConfig
      const result = await generateText({
        model: google('gemini-2.5-flash-image-preview', providerOptions),
        prompt,
      });

      const imageFiles = result.files?.filter(
        (file) => file.mediaType?.startsWith('image/')
      ) || [];

      if (imageFiles.length === 0) {
        throw new Error('No images generated');
      }

      // Save images
      const savedImages = [];
      for (const file of imageFiles) {
        const filePath = await saveImage(file, batchId, generationId);

        const [imageRecord] = await db.insert(images).values({
          generationId,
          filePath,
          fileName: filePath.split('/').pop() || 'unknown',
          mediaType: file.mediaType || 'image/png',
          fileSize: file.uint8Array?.length,
          metadata: { prompt, runNumber: options.runNumber },
        }).returning();

        savedImages.push(imageRecord);
      }

      // Update generation with success
      await db.update(generations)
        .set({
          status: 'success',
          metadata: {
            provider: 'gemini',
            text: result.text,
            finishReason: result.finishReason,
            usage: result.usage,
            imageCount: imageFiles.length,
          },
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      return {
        generationId,
        images: savedImages.map(img => ({
          id: img.id,
          filePath: img.filePath,
          fileName: img.fileName,
          mediaType: img.mediaType,
          fileSize: img.fileSize,
        })),
        metadata: { provider: 'gemini', imageCount: imageFiles.length },
      };

    } catch (error) {
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
