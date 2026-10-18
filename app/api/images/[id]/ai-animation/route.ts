import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { imagesService } from '@/lib/services';
import { AI_ANIMATION_GRID_SIZES, generateAiAnimation } from '@/lib/ai/ai-animation';
import { readImage, writeStoredFile } from '@/lib/storage/local-storage';
import { resolveStoragePath, toStoredPath } from '@/lib/storage/resolve-path';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

const aiAnimationSchema = z.object({
  prompt: z.string().trim().min(1, 'Animation prompt is required'),
  gridSize: z
    .number()
    .refine((n) => (AI_ANIMATION_GRID_SIZES as readonly number[]).includes(n), 'Grid size must be 2, 3, or 4')
    .default(2),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { prompt, gridSize } = await parseBody(request, aiAnimationSchema);

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    // Use transparent version if available, otherwise use original
    const sourcePath = resolveStoragePath(image.transparentFilePath || image.filePath);
    const result = await generateAiAnimation(
      sourcePath,
      await readImage(sourcePath),
      image.mediaType || 'image/png',
      prompt,
      gridSize
    );

    const spritesheetPath = path.join(path.dirname(sourcePath), `${path.parse(image.fileName).name}_${Date.now()}_ai.png`);
    await writeStoredFile(spritesheetPath, result.buffer);

    const animation = await imagesService.createSquishAnimation({
      imageId: id,
      spritesheetPath: toStoredPath(spritesheetPath),
      frameCount: result.frameCount,
      intensity: 0, // Not applicable for AI animations
      animationType: 'bounce', // Default, not used for AI
      generatedBy: 'ai',
      aiPrompt: prompt,
      fullAiPrompt: result.fullAiPrompt,
      metadata: {
        width: result.width,
        height: result.height,
        frameWidth: result.frameWidth,
        frameHeight: result.frameHeight,
        gridSize,
        duration: 1000, // Default 1000ms per cycle
        model: result.model,
        size: result.size,
        revisedPrompt: result.revisedPrompt,
        usage: result.usage,
      },
    });

    return NextResponse.json({
      success: true,
      animation: {
        id: animation.id,
        spritesheetPath: animation.spritesheetPath,
        frameCount: result.frameCount,
        gridSize,
        aiPrompt: prompt,
        fullAiPrompt: result.fullAiPrompt,
        metadata: animation.metadata,
      },
    });
  } catch (error) {
    return handleApiError(error, 'generate AI animation');
  }
}
