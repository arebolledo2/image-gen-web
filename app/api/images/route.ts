import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, generations, batches, batchPrompts, prompts, subjects } from '@/lib/db/schema';
import { desc, eq, and, or, ilike as ilikeFn, isNotNull } from 'drizzle-orm';

// GET /api/images - List images with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const transparentOnly = searchParams.get('transparentOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const results = await db.query.images.findMany({
      where: (images, { and: andFn, eq: eqFn, exists }) => {
        const conditions = [];

        if (favoritesOnly) {
          conditions.push(eqFn(images.isFavorite, true));
        }

        if (batchId) {
          conditions.push(exists(
            db.select()
              .from(generations)
              .where(
                and(
                  eq(generations.id, images.generationId),
                  eq(generations.batchId, batchId)
                )
              )
          ));
        }

        if (search) {
          conditions.push(exists(
            db.select()
              .from(generations)
              .innerJoin(batches, eq(generations.batchId, batches.id))
              .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
              .where(
                and(
                  eq(generations.id, images.generationId),
                  or(
                    ilikeFn(batches.name, `%${search}%`),
                    ilikeFn(batchPrompts.promptText, `%${search}%`)
                  )
                )
              )
          ));
        }

        if (transparentOnly) {
          conditions.push(isNotNull(images.transparentFilePath));
        }

        // Filter by category through: generations → batchPrompts → prompts → subjects
        if (categoryId) {
          conditions.push(exists(
            db.select()
              .from(generations)
              .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
              .innerJoin(prompts, eq(batchPrompts.promptId, prompts.id))
              .innerJoin(subjects, eq(prompts.subjectId, subjects.id))
              .where(
                and(
                  eq(generations.id, images.generationId),
                  eq(subjects.categoryId, categoryId)
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
            batchPrompt: true,
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
