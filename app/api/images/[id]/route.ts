import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
      with: {
        generation: {
          with: {
            batch: true,
            batchPrompt: {
              with: {
                prompt: {
                  with: {
                    style: true,
                    subject: true,
                    promptGuidance: {
                      with: {
                        guidance: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!imageRecord) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const batchPrompt = imageRecord.generation?.batchPrompt ?? null;
    const prompt = batchPrompt?.prompt ?? null;

    const response = {
      id: imageRecord.id,
      filePath: imageRecord.filePath,
      fileName: imageRecord.fileName,
      mediaType: imageRecord.mediaType,
      isFavorite: imageRecord.isFavorite,
      transparentFilePath: imageRecord.transparentFilePath,
      flippedFilePath: imageRecord.flippedFilePath,
      createdAt: imageRecord.createdAt,
      generation: {
        batch: imageRecord.generation?.batch ? {
          id: imageRecord.generation.batch.id,
          name: imageRecord.generation.batch.name,
        } : null,
        batchPrompt: batchPrompt ? {
          id: batchPrompt.id,
          promptText: batchPrompt.promptText,
          prompt: prompt ? {
            style: prompt.style ? {
              id: prompt.style.id,
              name: prompt.style.name,
            } : null,
            subject: prompt.subject ? {
              id: prompt.subject.id,
              name: prompt.subject.name,
            } : null,
            guidance: prompt.promptGuidance
              .map((pg) => pg.guidance)
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
              .map((item) => ({
                id: item.id,
                name: item.name,
              })),
          } : null,
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
