import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { imagesService } from '@/lib/services';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

const updateImageSchema = z.object({
  isFavorite: z.boolean({ error: 'isFavorite must be a boolean' }),
});

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const imageRecord = await imagesService.getImageWithProvenance(id);
    if (!imageRecord) throw notFound('Image');

    const batchPrompt = imageRecord.generation?.batchPrompt ?? null;
    const prompt = batchPrompt?.prompt ?? null;

    return NextResponse.json({
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
            style: prompt.style ? { id: prompt.style.id, name: prompt.style.name } : null,
            subject: prompt.subject ? { id: prompt.subject.id, name: prompt.subject.name } : null,
            guidance: prompt.promptGuidance
              .map((pg) => pg.guidance)
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
              .map((item) => ({ id: item.id, name: item.name })),
          } : null,
        } : null,
      },
    });
  } catch (error) {
    return handleApiError(error, 'fetch image');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { isFavorite } = await parseBody(request, updateImageSchema);

    const image = await imagesService.toggleFavorite(id, isFavorite);
    if (!image) throw notFound('Image');

    return NextResponse.json({ image });
  } catch (error) {
    return handleApiError(error, 'update image');
  }
}
