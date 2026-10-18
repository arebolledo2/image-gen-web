import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

const toInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// GET /api/images - List images with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = toInt(searchParams.get('limit'), 20);

    const results = await imagesService.listImages({
      batchId: searchParams.get('batchId') || undefined,
      favoritesOnly: searchParams.get('favoritesOnly') === 'true',
      transparentOnly: searchParams.get('transparentOnly') === 'true',
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      limit,
      offset: toInt(searchParams.get('offset'), 0),
    });

    return NextResponse.json({
      images: results,
      total: results.length,
      hasMore: results.length === limit,
    });
  } catch (error) {
    return handleApiError(error, 'fetch images');
  }
}
