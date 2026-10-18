import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';
import { deleteStoredFileQuietly } from '@/lib/storage/local-storage';
import { ApiError, handleApiError, notFound } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

// GET - list all edits for an image
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const image = await imagesService.findById(id);
    if (!image) throw notFound('Image');

    const edits = await imagesService.getImageEditsByImage(id);
    return NextResponse.json({ edits });
  } catch (error) {
    return handleApiError(error, 'fetch image edits');
  }
}

// DELETE - remove an image edit and its files (?editId=...)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const editId = new URL(request.url).searchParams.get('editId');
    if (!editId) throw new ApiError(400, 'Edit ID required');

    const edit = await imagesService.getImageEdit(editId);
    if (!edit) throw notFound('Edit');
    if (edit.imageId !== id) throw new ApiError(403, 'Edit does not belong to this image');

    // Continue with database deletion even if file deletion fails
    await deleteStoredFileQuietly(edit.editedFilePath);
    if (edit.transparentEditPath) await deleteStoredFileQuietly(edit.transparentEditPath);

    await imagesService.deleteImageEdit(editId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete image edit');
  }
}
