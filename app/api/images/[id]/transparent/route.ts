import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { imagesService } from '@/lib/services';
import { makeTransparent, transparencyBodySchema } from '@/lib/image-processing/transparency';
import { resolveStoragePath } from '@/lib/storage/resolve-path';
import { writeStoredFile } from '@/lib/storage/local-storage';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { forceOriginal, ...options } = await parseBody(request, transparencyBodySchema);

    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    // Build on the existing transparent version so earlier clearing is preserved
    const sourcePath = (!forceOriginal && image.transparentFilePath) || image.filePath;
    const result = await makeTransparent(resolveStoragePath(sourcePath), options);

    if (result.fullyTransparent) {
      return NextResponse.json({
        success: false,
        message: 'The entire image appears to be transparent. Please click directly on a visible area.',
        alreadyTransparent: true,
        transparentFilePath: image.transparentFilePath,
      });
    }

    const baseName = path.basename(image.fileName, path.extname(image.fileName));
    const transparentFilePath = path.join(path.dirname(image.filePath), `${baseName}_transparent.png`);
    await writeStoredFile(transparentFilePath, result.buffer);
    await imagesService.updateImagePaths(id, { transparentFilePath });

    return NextResponse.json({ success: true, transparentFilePath });
  } catch (error) {
    return handleApiError(error, 'process transparency');
  }
}
