import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { imagesService } from '@/lib/services';
import { readImage } from '@/lib/storage/local-storage';
import { handleApiError, notFound } from '@/lib/api/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version'); // 'original', 'transparent' or 'flipped'

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    let filePath = image.filePath;
    if (version === 'transparent' && image.transparentFilePath) {
      filePath = image.transparentFilePath;
    } else if (version === 'flipped' && image.flippedFilePath) {
      filePath = image.flippedFilePath;
    }

    if (searchParams.get('size') === 'thumbnail') {
      const { getThumbnail } = await import('@/lib/storage/thumbnail');
      filePath = await getThumbnail(filePath, 512);
    }

    const fileBuffer = await readImage(filePath);

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png', // Thumbnails and transparent versions are PNG
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return handleApiError(error, 'serve image');
  }
}
