import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { db } from '@/lib/db';
import { generations, images, batches } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { saveImage } from '@/lib/storage/local-storage';

export interface ImageGenerationOptions {
  prompt: string;
  batchId: string;
  batchPromptId: string;
  runNumber: number;
}

export async function generateImage(options: ImageGenerationOptions) {
  const { prompt, batchId, batchPromptId, runNumber } = options;

  // Create generation record
  const [generation] = await db.insert(generations).values({
    batchId,
    batchPromptId,
    runNumber,
    status: 'running',
  }).returning();

  try {
    // Call Gemini to generate image
    const result = await generateText({
      model: google('gemini-2.5-flash-image-preview'),
      prompt,
    });

    // Extract images from result.files
    const imageFiles = result.files?.filter(
      (file) => file.mediaType?.startsWith('image/')
    ) || [];

    if (imageFiles.length === 0) {
      throw new Error('No images generated');
    }

    // Save images and create records
    const savedImages = [];
    for (const file of imageFiles) {
      const filePath = await saveImage(file, batchId, generation.id);

      const [imageRecord] = await db.insert(images).values({
        generationId: generation.id,
        filePath,
        fileName: filePath.split('/').pop() || 'unknown',
        mediaType: file.mediaType || 'image/png',
        fileSize: file.uint8Array?.length,
        metadata: {
          prompt,
          runNumber,
        },
      }).returning();

      savedImages.push(imageRecord);
    }

    // Update generation with success
    await db.update(generations)
      .set({
        status: 'success',
        metadata: {
          text: result.text,
          finishReason: result.finishReason,
          usage: result.usage,
          imageCount: imageFiles.length,
        },
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));

    return {
      generation,
      images: savedImages,
    };
  } catch (error) {
    // Update generation with error
    await db.update(generations)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));

    throw error;
  }
}

export async function executeBatch(batchId: string) {
  // Update batch status to running
  await db.update(batches)
    .set({ status: 'running' })
    .where(eq(batches.id, batchId));

  try {
    // Get batch with all prompts
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
      with: {
        batchPrompts: {
          orderBy: (batchPrompts, { asc }) => [asc(batchPrompts.order)],
        },
      },
    });

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Execute each prompt
    for (const batchPrompt of batch.batchPrompts) {
      const count = batchPrompt.overrides?.count || batch.defaults?.count || 1;

      // Generate multiple times based on count
      for (let run = 1; run <= count; run++) {
        await generateImage({
          prompt: batchPrompt.promptText,
          batchId,
          batchPromptId: batchPrompt.id,
          runNumber: run,
        });
      }
    }

    // Update batch status to completed
    await db.update(batches)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(batches.id, batchId));

    return { success: true };
  } catch (error) {
    // Update batch status to failed
    await db.update(batches)
      .set({ status: 'failed' })
      .where(eq(batches.id, batchId));

    throw error;
  }
}
