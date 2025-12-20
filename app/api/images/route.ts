import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';

// GET /api/images - List images with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.query.images.findMany({
      orderBy: [desc(images.createdAt)],
      limit,
      offset,
      with: {
        generation: {
          with: {
            batch: true,
          },
        },
      },
    });

    const allImages = await query;

    // Filter by batchId if provided
    let filteredImages = allImages;
    if (batchId) {
      filteredImages = allImages.filter(
        (img) => img.generation.batchId === batchId
      );
    }

    return NextResponse.json({
      images: filteredImages,
      total: filteredImages.length,
      hasMore: filteredImages.length === limit,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
