/**
 * AI Edit API Route
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, squishAnimations, imageEdits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs/promises';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { editOpenAIImage, OPENAI_IMAGE_MODEL, type OpenAIImageSize } from '@/lib/providers/openai/openai-image-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userPrompt = body.userPrompt?.trim();
    const sourceVersion = body.sourceVersion || 'original';

    // Validate inputs
    if (!userPrompt) {
      return NextResponse.json({ error: 'Edit prompt is required' }, { status: 400 });
    }

    // Fetch the image record
    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Resolve source file path based on sourceVersion
    let sourceFilePath: string;

    if (sourceVersion === 'original') {
      sourceFilePath = imageRecord.filePath;
    } else if (sourceVersion === 'transparent') {
      if (!imageRecord.transparentFilePath) {
        return NextResponse.json({ error: 'Transparent version not found' }, { status: 404 });
      }
      sourceFilePath = imageRecord.transparentFilePath;
    } else if (sourceVersion === 'flipped') {
      if (!imageRecord.flippedFilePath) {
        return NextResponse.json({ error: 'Flipped version not found' }, { status: 404 });
      }
      sourceFilePath = imageRecord.flippedFilePath;
    } else if (sourceVersion.startsWith('squish-') || sourceVersion.startsWith('ai-')) {
      const animationId = sourceVersion.replace(/^(squish-|ai-)/, '');
      const animation = await db.query.squishAnimations.findFirst({
        where: eq(squishAnimations.id, animationId),
      });
      if (!animation) {
        return NextResponse.json({ error: 'Animation version not found' }, { status: 404 });
      }
      sourceFilePath = animation.spritesheetPath;
    } else if (sourceVersion.startsWith('edit-')) {
      const editId = sourceVersion.replace('edit-', '');
      const edit = await db.query.imageEdits.findFirst({
        where: eq(imageEdits.id, editId),
      });
      if (!edit) {
        return NextResponse.json({ error: 'Edit version not found' }, { status: 404 });
      }
      sourceFilePath = edit.editedFilePath;
    } else {
      return NextResponse.json({ error: 'Invalid source version' }, { status: 400 });
    }

    // Convert to absolute path
    const absolutePath = path.isAbsolute(sourceFilePath)
      ? sourceFilePath
      : path.join(/* turbopackIgnore: true */ process.cwd(), sourceFilePath);

    // Read the source image
    const imageBuffer = await fs.readFile(absolutePath);
    const mimeType = imageRecord.mediaType || 'image/png';

    // Load the source image with Jimp to get dimensions
    const sourceImage = await (Jimp as any).read(absolutePath);
    const sourceWidth = sourceImage.bitmap.width;
    const sourceHeight = sourceImage.bitmap.height;

    const getOpenAIEditSize = (width: number, height: number): OpenAIImageSize => {
      const ratio = width / height;
      if (ratio > 1.1) return '1536x1024';
      if (ratio < 0.9) return '1024x1536';
      return '1024x1024';
    };

    const calculatedSize = getOpenAIEditSize(sourceWidth, sourceHeight);

    // Construct the full AI prompt
    const fullAiPrompt = `Edit this image according to the following instructions:

${userPrompt}

GUIDELINES FOR BEST RESULTS:
1. Maintain the original composition and style
2. Focus on the requested changes while keeping the rest of the image consistent
3. Preserve transparency if the source image has transparency
4. Keep the same dimensions and aspect ratio
5. Ensure the edited result looks natural and cohesive

Edit instruction: ${userPrompt}`;

    const generated = await editOpenAIImage({
      prompt: fullAiPrompt,
      imageBuffer,
      imageName: path.basename(absolutePath),
      mimeType,
      size: calculatedSize,
    });
    const generatedBuffer = generated.buffer;

    // Load the edited image with Jimp to get dimensions
    const editedImage = await (Jimp as any).read(generatedBuffer);
    const width = editedImage.bitmap.width;
    const height = editedImage.bitmap.height;

    // Generate descriptive name using Gemini 2.5 Flash
    const { text: generatedName } = await generateText({
      model: google('gemini-3.1-flash-preview'),
      prompt: `Generate a concise descriptive name (3-5 words) for this image edit. User instruction: "${userPrompt}". Output only the name, nothing else.`,
    });

    const finalName = generatedName.trim();

    // Save the edited image
    const parsedPath = path.parse(absolutePath);
    const timestamp = Date.now();
    const editedFileName = `${parsedPath.name}_edit_${timestamp}.png`;
    const editedFilePath = path.join(parsedPath.dir, editedFileName);

    await fs.writeFile(editedFilePath, generatedBuffer);

    // Store relative path
    const relativePath = path.relative(process.cwd(), editedFilePath);

    // Insert into database
    const [edit] = await db.insert(imageEdits).values({
      imageId: id,
      sourceVersion,
      editedFilePath: relativePath,
      userPrompt,
      fullAiPrompt,
      generatedName: finalName,
      metadata: {
        width,
        height,
        sourceFilePath,
        model: OPENAI_IMAGE_MODEL,
        size: calculatedSize,
        revisedPrompt: generated.revisedPrompt,
        usage: generated.usage,
      },
    }).returning();

    return NextResponse.json({
      success: true,
      edit: {
        id: edit.id,
        editedFilePath: relativePath,
        generatedName: finalName,
        userPrompt,
        fullAiPrompt,
        metadata: edit.metadata,
      },
    });

  } catch (error) {
    console.error('Error generating AI edit:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate AI edit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
