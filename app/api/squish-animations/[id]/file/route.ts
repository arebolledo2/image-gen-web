import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';
import { readImage } from '@/lib/storage/local-storage';
import { handleApiError, notFound } from '@/lib/api/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const animation = await imagesService.getSquishAnimation(id);
    if (!animation) throw notFound('Animation');

    return new NextResponse(await readImage(animation.spritesheetPath) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return handleApiError(error, 'serve file');
  }
}
