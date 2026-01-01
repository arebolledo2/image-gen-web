/**
 * AI Animation API Route
 * Note: Uses `any` for dynamic Gemini API response structures.
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
      : path.join(process.cwd(), filePathToLoad);

    // Read the source image and convert to base64
    const imageBuffer = await fs.readFile(absolutePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageRecord.mediaType || 'image/png';

    // Get API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Construct the Gemini prompt
    const geminiPrompt = `Generate a ${gridSize}x${gridSize} grid sprite sheet (${frameCount} frames total) for this animation:

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

    // Call Gemini 3 Pro with multimodal input
    const model = 'gemini-3-pro-image-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: geminiPrompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1', // Square output for grid
          imageSize: '2K' // Higher resolution for better quality
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini 3 API request failed: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('No response from Gemini 3');
    }

    const candidate = result.candidates[0];

    // Check for safety filters
    if (candidate.finishReason === 'SAFETY') {
      return NextResponse.json(
        { success: false, error: 'Animation generation blocked by safety filters' },
        { status: 400 }
      );
    }

    const parts = candidate.content?.parts || [];
    const imageParts = parts.filter((part: any) => part.inlineData && part.inlineData.data);

    if (imageParts.length === 0) {
      throw new Error('No images generated by Gemini 3');
    }

    // Get the first generated image (should be the sprite sheet grid)
    const generatedPart = imageParts[0];
    const base64Data = generatedPart.inlineData.data;
    const generatedBuffer = Buffer.from(base64Data, 'base64');

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
      fullAiPrompt: geminiPrompt,
      metadata: {
        width: totalWidth,
        height: totalHeight,
        frameWidth,
        frameHeight,
        gridSize,
        duration: 1000, // Default 1000ms per cycle
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
        fullAiPrompt: geminiPrompt,
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
