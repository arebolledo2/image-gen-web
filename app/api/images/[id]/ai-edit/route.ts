import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { z } from 'zod';
import { imagesService } from '@/lib/services';
import { generateAiEdit } from '@/lib/ai/image-edit';
import { readImage, writeStoredFile } from '@/lib/storage/local-storage';
import { resolveStoragePath, toStoredPath } from '@/lib/storage/resolve-path';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

const aiEditSchema = z.object({
  userPrompt: z.string().trim().min(1, 'Edit prompt is required'),
  sourceVersion: z.string().default('original'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userPrompt, sourceVersion } = await parseBody(request, aiEditSchema);

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    const source = await imagesService.resolveSourceFile(image, sourceVersion);
    const absoluteSource = resolveStoragePath(source.filePath);

    const result = await generateAiEdit(
      absoluteSource,
      userPrompt,
      image.mediaType || 'image/png',
      await readImage(absoluteSource)
    );

    const parsed = path.parse(absoluteSource);
    const editedPath = path.join(parsed.dir, `${parsed.name}_edit_${Date.now()}.png`);
    await writeStoredFile(editedPath, result.buffer);

    const edit = await imagesService.createImageEdit({
      imageId: id,
      sourceVersion,
      editedFilePath: toStoredPath(editedPath),
      userPrompt,
      fullAiPrompt: result.fullAiPrompt,
      generatedName: result.generatedName,
      metadata: {
        width: result.width,
        height: result.height,
        sourceFilePath: source.filePath,
        model: result.model,
        size: result.size,
        revisedPrompt: result.revisedPrompt,
        usage: result.usage,
      },
    });

    return NextResponse.json({
      success: true,
      edit: {
        id: edit.id,
        editedFilePath: edit.editedFilePath,
        generatedName: edit.generatedName,
        userPrompt,
        fullAiPrompt: result.fullAiPrompt,
        metadata: edit.metadata,
      },
    });
  } catch (error) {
    return handleApiError(error, 'generate AI edit');
  }
}
