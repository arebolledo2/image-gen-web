import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { imagesService } from '@/lib/services';
import { flipHorizontal } from '@/lib/image-processing/flip';
import { resolveStoragePath } from '@/lib/storage/resolve-path';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

const flipBodySchema = z.object({
  // Defaults to transparent for backward compatibility
  sourceVersion: z.string().default('transparent'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sourceVersion } = await parseBody(request, flipBodySchema);

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    const source = await imagesService.resolveSourceFile(image, sourceVersion);
    const flipped = await flipHorizontal(resolveStoragePath(source.filePath));

    const baseName = path.basename(image.fileName, path.extname(image.fileName));
    const flippedFilePath = path.join(path.dirname(image.filePath), `${baseName}_${source.name}_flipped.png`);
    const absoluteFlippedPath = resolveStoragePath(flippedFilePath);

    await fs.mkdir(path.dirname(absoluteFlippedPath), { recursive: true });
    await fs.writeFile(absoluteFlippedPath, flipped);

    // Only the original image's flipped path is tracked in the database
    if (sourceVersion === 'transparent' || sourceVersion === 'original') {
      await imagesService.updateImagePaths(id, { flippedFilePath });
    }

    return NextResponse.json({ success: true, flippedFilePath });
  } catch (error) {
    return handleApiError(error, 'flip image');
  }
}
