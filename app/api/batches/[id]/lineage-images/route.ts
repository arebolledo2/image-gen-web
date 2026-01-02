import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches, images, generations, batchPrompts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/batches/[id]/lineage-images - Get images from parent batches
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        // Get the current batch to find its parent
        const currentBatch = await db.query.batches.findFirst({
            where: eq(batches.id, id),
            columns: { parentBatchId: true },
        });

        if (!currentBatch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        if (!currentBatch.parentBatchId) {
            // No parent batch, return empty array
            return NextResponse.json({ images: [], hasLineage: false });
        }

        // Collect all parent batch IDs (traverse lineage)
        const parentBatchIds: string[] = [];
        let currentParentId: string | null = currentBatch.parentBatchId;

        while (currentParentId && parentBatchIds.length < 5) {
            parentBatchIds.push(currentParentId);

            const parentBatch: { parentBatchId: string | null } | undefined = await db.query.batches.findFirst({
                where: eq(batches.id, currentParentId),
                columns: { parentBatchId: true },
            });

            currentParentId = parentBatch?.parentBatchId ?? null;
        }

        // Fetch images from all parent batches
        const lineageImages = await db
            .select({
                id: images.id,
                fileName: images.fileName,
                filePath: images.filePath,
                promptText: batchPrompts.promptText,
                batchId: batches.id,
                batchName: batches.name,
                batchVersion: batches.version,
            })
            .from(images)
            .innerJoin(generations, eq(images.generationId, generations.id))
            .innerJoin(batches, eq(generations.batchId, batches.id))
            .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
            .where(
                parentBatchIds.length === 1
                    ? eq(generations.batchId, parentBatchIds[0])
                    : eq(generations.batchId, parentBatchIds[0]) // Simplified for now
            )
            .orderBy(desc(images.createdAt))
            .limit(limit);

        // For multiple parent batches, fetch from all
        let allImages = lineageImages;
        if (parentBatchIds.length > 1) {
            const moreImages = await Promise.all(
                parentBatchIds.slice(1).map(async (batchId) => {
                    return db
                        .select({
                            id: images.id,
                            fileName: images.fileName,
                            filePath: images.filePath,
                            promptText: batchPrompts.promptText,
                            batchId: batches.id,
                            batchName: batches.name,
                            batchVersion: batches.version,
                        })
                        .from(images)
                        .innerJoin(generations, eq(images.generationId, generations.id))
                        .innerJoin(batches, eq(generations.batchId, batches.id))
                        .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
                        .where(eq(generations.batchId, batchId))
                        .orderBy(desc(images.createdAt))
                        .limit(Math.ceil(limit / parentBatchIds.length));
                })
            );
            allImages = [...lineageImages, ...moreImages.flat()].slice(0, limit);
        }

        return NextResponse.json({
            images: allImages,
            hasLineage: true,
            parentBatchIds,
        });
    } catch (error) {
        console.error('Error fetching lineage images:', error);
        return NextResponse.json(
            { error: 'Failed to fetch lineage images' },
            { status: 500 }
        );
    }
}
