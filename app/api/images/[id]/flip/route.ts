import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, imageEdits, squishAnimations } from '@/lib/db/schema';
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
    const sourceVersion = body.sourceVersion || 'transparent'; // Default to transparent for backward compatibility

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Resolve source file path based on version
    let sourceFilePath: string;
    let sourceName: string;

    if (sourceVersion === 'original') {
      sourceFilePath = imageRecord.filePath;
      sourceName = 'original';
    } else if (sourceVersion === 'transparent') {
      if (!imageRecord.transparentFilePath) {
        return NextResponse.json({
          success: false,
          message: 'No transparent version available. Create transparency first.'
        }, { status: 400 });
      }
      sourceFilePath = imageRecord.transparentFilePath;
      sourceName = 'transparent';
    } else if (sourceVersion === 'flipped') {
      if (!imageRecord.flippedFilePath) {
        return NextResponse.json({
          success: false,
          message: 'No flipped version available.'
        }, { status: 400 });
      }
      sourceFilePath = imageRecord.flippedFilePath;
      sourceName = 'flipped';
    } else if (sourceVersion.startsWith('edit-transparent-')) {
      const editId = sourceVersion.replace('edit-transparent-', '');
      const edit = await db.query.imageEdits.findFirst({
        where: eq(imageEdits.id, editId),
      });
      if (!edit) {
        return NextResponse.json({ error: 'Edit not found' }, { status: 404 });
      }
      if (!edit.transparentEditPath) {
        return NextResponse.json({
          success: false,
          message: 'No transparent edit version available.'
        }, { status: 400 });
      }
      sourceFilePath = edit.transparentEditPath;
      sourceName = `edit_${edit.generatedName.replace(/\s+/g, '_')}_transparent`;
    } else if (sourceVersion.startsWith('edit-')) {
      const editId = sourceVersion.replace('edit-', '');
      const edit = await db.query.imageEdits.findFirst({
        where: eq(imageEdits.id, editId),
      });
      if (!edit) {
        return NextResponse.json({ error: 'Edit not found' }, { status: 404 });
      }
      sourceFilePath = edit.editedFilePath;
      sourceName = `edit_${edit.generatedName.replace(/\s+/g, '_')}`;
    } else if (sourceVersion.startsWith('squish-') || sourceVersion.startsWith('ai-')) {
      const animationId = sourceVersion.replace(/^(squish-|ai-)/, '');
      const animation = await db.query.squishAnimations.findFirst({
        where: eq(squishAnimations.id, animationId),
      });
      if (!animation) {
        return NextResponse.json({ error: 'Animation not found' }, { status: 404 });
      }
      sourceFilePath = animation.spritesheetPath;
      sourceName = `animation_${animationId.substring(0, 8)}`;
    } else {
      return NextResponse.json({
        error: 'Invalid source version'
      }, { status: 400 });
    }

    // Load source image
    const absolutePath = path.isAbsolute(sourceFilePath)
      ? sourceFilePath
      : path.join(process.cwd(), sourceFilePath);

    const image = await (Jimp as any).read(absolutePath);

    // Apply horizontal flip
    image.flip({ horizontal: true, vertical: false });

    const flippedBuffer = await image.getBuffer('image/png');

    // Generate filename based on source
    const ext = path.extname(imageRecord.fileName);
    const baseName = path.basename(imageRecord.fileName, ext);
    const flippedFileName = `${baseName}_${sourceName}_flipped.png`;

    const dirName = path.dirname(imageRecord.filePath);
    const flippedFilePath = path.join(dirName, flippedFileName);

    const absoluteFlippedPath = path.isAbsolute(flippedFilePath)
      ? flippedFilePath
      : path.join(process.cwd(), flippedFilePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(absoluteFlippedPath), { recursive: true });

    // Write file
    await fs.writeFile(absoluteFlippedPath, flippedBuffer);

    // Update DB (only for original image flipped path)
    if (sourceVersion === 'transparent' || sourceVersion === 'original') {
      await db
        .update(images)
        .set({ flippedFilePath: flippedFilePath })
        .where(eq(images.id, id));
    }

    return NextResponse.json({
      success: true,
      flippedFilePath: flippedFilePath
    });

  } catch (error) {
    console.error('Error flipping image:', error);
    return NextResponse.json(
      { error: 'Failed to flip image: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
