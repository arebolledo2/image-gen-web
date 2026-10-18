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

    const edit = await imagesService.getImageEdit(id);
    if (!edit) throw notFound('Edit');

    // Build on the existing transparent version so earlier clearing is preserved
    const sourcePath = (!forceOriginal && edit.transparentEditPath) || edit.editedFilePath;
    const result = await makeTransparent(resolveStoragePath(sourcePath), options);

    if (result.fullyTransparent) {
      return NextResponse.json({
        success: false,
        message: 'Cannot find a visible pixel near click position. Please click directly on a visible area.',
        alreadyTransparent: true,
        transparentEditPath: edit.transparentEditPath,
      });
    }

    const parsed = path.parse(edit.editedFilePath);
    const transparentEditPath = path.join(parsed.dir, `${parsed.name}_transparent.png`);
    await writeStoredFile(transparentEditPath, result.buffer);
    await imagesService.setImageEditTransparentPath(id, transparentEditPath);

    return NextResponse.json({ success: true, transparentEditPath });
  } catch (error) {
    return handleApiError(error, 'process transparency');
  }
}
