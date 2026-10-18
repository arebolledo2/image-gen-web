import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { imagesService } from '@/lib/services';
import { generateSquishSpritesheet, SQUISH_FRAME_COUNTS } from '@/lib/image-processing/squish';
import { resolveStoragePath, toStoredPath } from '@/lib/storage/resolve-path';
import { ApiError, handleApiError, notFound, parseBody } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

const INTENSITY_MESSAGE = 'Intensity must be between 0 and 100';

const squishBodySchema = z.object({
  frameCount: z
    .number()
    .refine((n) => (SQUISH_FRAME_COUNTS as readonly number[]).includes(n), 'Frame count must be 4, 8, 12, or 16')
    .default(8),
  intensity: z.number().min(0, INTENSITY_MESSAGE).max(100, INTENSITY_MESSAGE).default(20),
  animationType: z.enum(['bounce', 'squash_stretch']).default('bounce'),
});

// POST - generate a squish sprite sheet for an image
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const options = await parseBody(request, squishBodySchema);

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    // Use transparent version if available, otherwise use original
    const sourcePath = resolveStoragePath(image.transparentFilePath || image.filePath);
    const result = await generateSquishSpritesheet(sourcePath, options);

    const fileName = `${path.parse(image.fileName).name}_${Date.now()}_squish.png`;
    const spritesheetPath = path.join(path.dirname(sourcePath), fileName);
    await fs.writeFile(spritesheetPath, result.buffer);

    const animation = await imagesService.createSquishAnimation({
      imageId: id,
      spritesheetPath: toStoredPath(spritesheetPath),
      frameCount: options.frameCount,
      intensity: options.intensity,
      animationType: options.animationType,
      metadata: {
        width: result.width,
        height: result.height,
        frameWidth: result.frameWidth,
        frameHeight: result.frameHeight,
        duration: 500, // Default 500ms per cycle
      },
    });

    return NextResponse.json({
      success: true,
      animation: {
        id: animation.id,
        spritesheetPath: animation.spritesheetPath,
        frameCount: options.frameCount,
        intensity: options.intensity,
        animationType: options.animationType,
        metadata: animation.metadata,
      },
    });
  } catch (error) {
    return handleApiError(error, 'generate squish animation');
  }
}

// GET - list all squish animations for an image
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    const animations = await imagesService.getSquishAnimationsByImage(id);
    return NextResponse.json({ animations });
  } catch (error) {
    return handleApiError(error, 'fetch squish animations');
  }
}

// DELETE - remove a squish animation (?animationId=...)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const animationId = new URL(request.url).searchParams.get('animationId');
    if (!animationId) throw new ApiError(400, 'Animation ID required');

    const animation = await imagesService.getSquishAnimation(animationId);
    if (!animation) throw notFound('Animation');
    if (animation.imageId !== id) throw new ApiError(403, 'Animation does not belong to this image');

    try {
      await fs.unlink(resolveStoragePath(animation.spritesheetPath));
    } catch (error) {
      // Continue with database deletion even if file deletion fails
      console.error('Error deleting sprite sheet file:', error);
    }

    await imagesService.deleteSquishAnimation(animationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete squish animation');
  }
}
