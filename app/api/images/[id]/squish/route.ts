/**
 * Squish Animation API Route
 * Note: Uses `any` for dynamic animation frame data structures.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, squishAnimations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const frameCount = body.frameCount ?? 8;
    const intensity = body.intensity ?? 20; // 0-100 percentage
    const animationType = body.animationType ?? 'bounce';

    // Validate inputs
    if (![4, 8, 12, 16].includes(frameCount)) {
      return NextResponse.json({ error: 'Frame count must be 4, 8, 12, or 16' }, { status: 400 });
    }
    if (intensity < 0 || intensity > 100) {
      return NextResponse.json({ error: 'Intensity must be between 0 and 100' }, { status: 400 });
    }

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Use transparent version if available, otherwise use original
    const filePathToLoad = imageRecord.transparentFilePath || imageRecord.filePath;
      const absolutePath = path.isAbsolute(filePathToLoad)
        ? filePathToLoad
        : path.join(/* turbopackIgnore: true */ process.cwd(), filePathToLoad);

    const originalImage = await (Jimp as any).read(absolutePath);
    const width = originalImage.bitmap.width;
    const height = originalImage.bitmap.height;

    // Generate frames with squish animation
    const frames: any[] = [];
    const intensityFactor = intensity / 100;

    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount; // 0 to 1
      let scaleY: number;
      let scaleX: number;

      if (animationType === 'squash_stretch') {
        // Squash and stretch with volume preservation
        // Vertical compression with horizontal expansion
        const squish = Math.sin(Math.PI * t) * Math.sin(Math.PI * t); // 0 -> 1 -> 0
        scaleY = 1 - (intensityFactor * squish);
        scaleX = 1 / scaleY; // Preserve volume
      } else {
        // Simple bounce - sine wave with easing
        const bounce = Math.sin(Math.PI * t) * (1 - t * 0.3); // Slight decay
        scaleY = 1 - (intensityFactor * bounce);
        scaleX = 1 + (intensityFactor * bounce * 0.3); // Slight horizontal squish
      }

      // Create frame with scaled dimensions
      const newHeight = Math.round(height * scaleY);
      const newWidth = Math.round(width * scaleX);

      // Clone and resize
      const frame = originalImage.clone();
      await frame.resize({ w: newWidth, h: newHeight });

      // Create canvas of original size and center the scaled image
      const canvas = new (Jimp as any)({
        width,
        height,
        color: 0x00000000, // Transparent
      });

      const offsetX = Math.round((width - newWidth) / 2);
      const offsetY = height - newHeight; // Anchor to bottom

      canvas.composite(frame, offsetX, offsetY);
      frames.push(canvas);
    }

    // Create horizontal sprite sheet
    const spritesheetWidth = width * frameCount;
    const spritesheetHeight = height;
    const spritesheet = new (Jimp as any)({
      width: spritesheetWidth,
      height: spritesheetHeight,
      color: 0x00000000,
    });

    // Composite all frames horizontally
    for (let i = 0; i < frameCount; i++) {
      spritesheet.composite(frames[i], i * width, 0);
    }

    // Save sprite sheet
    const parsedPath = path.parse(absolutePath);
    const timestamp = Date.now();
    const spritesheetFileName = `${path.parse(imageRecord.fileName).name}_${timestamp}_squish.png`;
    const spritesheetPath = path.join(parsedPath.dir, spritesheetFileName);

    const buffer = await spritesheet.getBuffer('image/png');
    await fs.writeFile(spritesheetPath, buffer);

    // Store relative path
    const relativePath = path.relative(process.cwd(), spritesheetPath);

    // Insert into database
    const [animation] = await db.insert(squishAnimations).values({
      imageId: id,
      spritesheetPath: relativePath,
      frameCount,
      intensity,
      animationType,
      metadata: {
        width: spritesheetWidth,
        height: spritesheetHeight,
        frameWidth: width,
        frameHeight: height,
        duration: 500, // Default 500ms per cycle
      },
    }).returning();

    return NextResponse.json({
      success: true,
      animation: {
        id: animation.id,
        spritesheetPath: relativePath,
        frameCount,
        intensity,
        animationType,
        metadata: animation.metadata,
      },
    });
  } catch (error) {
    console.error('Error generating squish animation:', error);
    return NextResponse.json(
      { error: 'Failed to generate squish animation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to list all squish animations for an image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
      with: {
        squishAnimations: true,
      },
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      animations: imageRecord.squishAnimations || [],
    });
  } catch (error) {
    console.error('Error fetching squish animations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch squish animations' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a squish animation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const animationId = searchParams.get('animationId');

    if (!animationId) {
      return NextResponse.json({ error: 'Animation ID required' }, { status: 400 });
    }

    // Get animation record to delete file
    const animation = await db.query.squishAnimations.findFirst({
      where: eq(squishAnimations.id, animationId),
    });

    if (!animation) {
      return NextResponse.json({ error: 'Animation not found' }, { status: 404 });
    }

    // Verify animation belongs to this image
    if (animation.imageId !== id) {
      return NextResponse.json({ error: 'Animation does not belong to this image' }, { status: 403 });
    }

    // Delete file
      const absolutePath = path.isAbsolute(animation.spritesheetPath)
        ? animation.spritesheetPath
        : path.join(/* turbopackIgnore: true */ process.cwd(), animation.spritesheetPath);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      console.error('Error deleting sprite sheet file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await db.delete(squishAnimations).where(eq(squishAnimations.id, animationId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting squish animation:', error);
    return NextResponse.json(
      { error: 'Failed to delete squish animation' },
      { status: 500 }
    );
  }
}
