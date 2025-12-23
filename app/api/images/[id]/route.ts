import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, generations, batches, batchPrompts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db
      .select({
        id: images.id,
        filePath: images.filePath,
        fileName: images.fileName,
        mediaType: images.mediaType,
        isFavorite: images.isFavorite,
        transparentFilePath: images.transparentFilePath,
        createdAt: images.createdAt,
        batchId: batches.id,
        batchName: batches.name,
        batchPromptId: batchPrompts.id,
        batchPromptText: batchPrompts.promptText,
      })
      .from(images)
      .leftJoin(generations, eq(images.generationId, generations.id))
      .leftJoin(batches, eq(generations.batchId, batches.id))
      .leftJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
      .where(eq(images.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const row = result[0];
    const response = {
      id: row.id,
      filePath: row.filePath,
      fileName: row.fileName,
      mediaType: row.mediaType,
      isFavorite: row.isFavorite,
      transparentFilePath: row.transparentFilePath,
      createdAt: row.createdAt,
      generation: {
        batch: row.batchId ? {
          id: row.batchId,
          name: row.batchName,
        } : null,
        batchPrompt: row.batchPromptId ? {
          id: row.batchPromptId,
          promptText: row.batchPromptText,
        } : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isFavorite } = body;

    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: 'isFavorite must be a boolean' },
        { status: 400 }
      );
    }

    const updated = await db
      .update(images)
      .set({ isFavorite })
      .where(eq(images.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ image: updated[0] });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
}
