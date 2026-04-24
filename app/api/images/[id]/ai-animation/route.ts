/**
 * AI Animation API Route
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, squishAnimations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs/promises';
import { editOpenAIImage, OPENAI_IMAGE_MODEL } from '@/lib/providers/openai/openai-image-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const prompt = body.prompt?.trim();
    const gridSize = body.gridSize ?? 2; // 2, 3, or 4

    // Validate inputs
    if (!prompt) {
      return NextResponse.json({ error: 'Animation prompt is required' }, { status: 400 });
    }
    if (![2, 3, 4].includes(gridSize)) {
      return NextResponse.json({ error: 'Grid size must be 2, 3, or 4' }, { status: 400 });
    }

    const frameCount = gridSize * gridSize; // 4, 9, or 16 frames

    // Fetch the image record
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

    // Read the source image
    const imageBuffer = await fs.readFile(absolutePath);
    const mimeType = imageRecord.mediaType || 'image/png';

    const openAIPrompt = `Generate a ${gridSize}x${gridSize} grid sprite sheet (${frameCount} frames total) for this animation:

${prompt}

ANIMATION GUIDELINES:
1. Create a ${gridSize}x${gridSize} grid of frames arranged in a square layout
2. Each frame should show progressive motion/transformation with incremental changes
3. Frames should be arranged left-to-right, top-to-bottom (reading order)
4. Aim for consistency across all frames:
   - Consistent art style, shading, and lighting
   - Similar color palette throughout
   - Shared level of detail
   - Consistent character size and proportions
5. Keep the sprite centered in each frame
6. Seek smooth transitions between frames:
   - Changes between consecutive frames should be gradual
   - Avoid sudden jumps in position or appearance
   - The first and last frames should ideally connect for looping
7. Preserve transparency using magenta #FF00FF background
8. The output should be a single square image containing the grid of animation frames
9. Stability is important - avoid excessive style shifts between frames
10. Make motion feel fluid across the sequence

Animation: ${prompt}
Total frames: ${frameCount}
Grid layout: ${gridSize} rows × ${gridSize} columns

Tip: Smooth, consistent changes usually produce the best animation results.`;

    const generated = await editOpenAIImage({
      prompt: openAIPrompt,
      imageBuffer,
      imageName: path.basename(absolutePath),
      mimeType,
      size: '1024x1024',
    });
    const generatedBuffer = generated.buffer;

    // Load the generated sprite sheet with Jimp
    const spritesheetImage = await (Jimp as any).read(generatedBuffer);
    const totalWidth = spritesheetImage.bitmap.width;
    const totalHeight = spritesheetImage.bitmap.height;

    // Calculate frame dimensions
    const frameWidth = Math.floor(totalWidth / gridSize);
    const frameHeight = Math.floor(totalHeight / gridSize);

    // Save the sprite sheet
    const parsedPath = path.parse(absolutePath);
    const timestamp = Date.now();
    const spritesheetFileName = `${path.parse(imageRecord.fileName).name}_${timestamp}_ai.png`;
    const spritesheetPath = path.join(parsedPath.dir, spritesheetFileName);

    await fs.writeFile(spritesheetPath, generatedBuffer);

    // Store relative path
    const relativePath = path.relative(process.cwd(), spritesheetPath);

    // Insert into database with AI-specific fields
    const [animation] = await db.insert(squishAnimations).values({
      imageId: id,
      spritesheetPath: relativePath,
      frameCount,
      intensity: 0, // Not applicable for AI animations
      animationType: 'bounce', // Default, not really used for AI
      generatedBy: 'ai',
      aiPrompt: prompt,
      fullAiPrompt: openAIPrompt,
      metadata: {
        width: totalWidth,
        height: totalHeight,
        frameWidth,
        frameHeight,
        gridSize,
        duration: 1000, // Default 1000ms per cycle
        model: OPENAI_IMAGE_MODEL,
        size: '1024x1024',
        revisedPrompt: generated.revisedPrompt,
        usage: generated.usage,
      },
    }).returning();

    return NextResponse.json({
      success: true,
      animation: {
        id: animation.id,
        spritesheetPath: relativePath,
        frameCount,
        gridSize,
        aiPrompt: prompt,
        fullAiPrompt: openAIPrompt,
        metadata: animation.metadata,
      },
    });

  } catch (error) {
    console.error('Error generating AI animation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate AI animation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
