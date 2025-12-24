import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
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

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Require transparent version to exist
    if (!imageRecord.transparentFilePath) {
      return NextResponse.json({
        success: false,
        message: 'No transparent version available. Create transparency first.'
      }, { status: 400 });
    }

    // Load transparent version
    const absolutePath = path.isAbsolute(imageRecord.transparentFilePath)
      ? imageRecord.transparentFilePath
      : path.join(process.cwd(), imageRecord.transparentFilePath);

    const image = await (Jimp as any).read(absolutePath);

    // Apply horizontal flip
    image.flip({ horizontal: true, vertical: false });

    const flippedBuffer = await image.getBuffer('image/png');

    // Generate filename: {baseName}_transparent_flipped.png
    const ext = path.extname(imageRecord.fileName);
    const baseName = path.basename(imageRecord.fileName, ext);
    const flippedFileName = `${baseName}_transparent_flipped.png`;

    const dirName = path.dirname(imageRecord.filePath);
    const flippedFilePath = path.join(dirName, flippedFileName);

    const absoluteFlippedPath = path.isAbsolute(flippedFilePath)
      ? flippedFilePath
      : path.join(process.cwd(), flippedFilePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(absoluteFlippedPath), { recursive: true });

    // Write file
    await fs.writeFile(absoluteFlippedPath, flippedBuffer);

    // Update DB
    await db
      .update(images)
      .set({ flippedFilePath: flippedFilePath })
      .where(eq(images.id, id));

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
