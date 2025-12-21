import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { readImage } from '@/lib/storage/local-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version'); // 'original' or 'transparent'

    const image = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    let filePath = image.filePath;
    if (version === 'transparent' && image.transparentFilePath) {
      filePath = image.transparentFilePath;
    }

    const fileBuffer = await readImage(filePath);

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png', // Transparent version is always PNG
        'Content-Disposition': `inline; filename="${image.fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}
