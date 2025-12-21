import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';

// GET /api/images - List images with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Need to use relations correctly with filtering
    // If batchId is provided, we need to join or filter via generation
    
    let whereClause = undefined;
    if (batchId || favoritesOnly) {
      // For findMany with 'with', it's easier to use the core db.select if we need complex filtering
      // but let's see if we can do it with findMany first by checking the schema
      // Actually, image has a generationId, but the batchId is on the generation table.
      // Drizzle findMany 'where' can only access the main table's columns easily.
      
      // Let's use the core builder for more control if batchId or favoritesOnly is present
      const results = await db.query.images.findMany({
        where: (images, { and: andFn, eq: eqFn, exists }) => {
          const conditions = [];
          
          if (favoritesOnly) {
            conditions.push(eqFn(images.isFavorite, true));
          }
          
          if (batchId) {
            conditions.push(exists(
              db.select()
                .from(require('@/lib/db/schema').generations)
                .where(
                  and(
                    eq(require('@/lib/db/schema').generations.id, images.generationId),
                    eq(require('@/lib/db/schema').generations.batchId, batchId)
                  )
                )
            ));
          }
          
          return conditions.length > 0 ? andFn(...conditions) : undefined;
        },
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

      return NextResponse.json({
        images: results,
        total: results.length, // Note: this is total in THIS page
        hasMore: results.length === limit,
      });
    }

    const results = await db.query.images.findMany({
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

    return NextResponse.json({
      images: results,
      total: results.length,
      hasMore: results.length === limit,
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
