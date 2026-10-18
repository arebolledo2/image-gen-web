import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';
import { readImage } from '@/lib/storage/local-storage';
import { handleApiError, notFound } from '@/lib/api/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const version = new URL(request.url).searchParams.get('version'); // 'transparent' or null

    const edit = await imagesService.getImageEdit(id);
    if (!edit) throw notFound('Edit');

    const filePath = version === 'transparent' && edit.transparentEditPath
      ? edit.transparentEditPath
      : edit.editedFilePath;

    return new NextResponse(await readImage(filePath) as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    return handleApiError(error, 'serve file');
  }
}
