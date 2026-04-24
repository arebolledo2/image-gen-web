import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images, imageEdits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

// GET endpoint to list all edits for an image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
      with: {
        imageEdits: true,
      },
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      edits: imageRecord.imageEdits || [],
    });
  } catch (error) {
    console.error('Error fetching image edits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image edits' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove an image edit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const editId = searchParams.get('editId');

    if (!editId) {
      return NextResponse.json({ error: 'Edit ID required' }, { status: 400 });
    }

    // Get edit record to delete file
    const edit = await db.query.imageEdits.findFirst({
      where: eq(imageEdits.id, editId),
    });

    if (!edit) {
      return NextResponse.json({ error: 'Edit not found' }, { status: 404 });
    }

    // Verify edit belongs to this image
    if (edit.imageId !== id) {
      return NextResponse.json({ error: 'Edit does not belong to this image' }, { status: 403 });
    }

    // Delete edit file
    const absolutePath = path.isAbsolute(edit.editedFilePath)
      ? edit.editedFilePath
      : path.join(/* turbopackIgnore: true */ process.cwd(), edit.editedFilePath);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      console.error('Error deleting edit file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete transparent edit file if it exists
    if (edit.transparentEditPath) {
      const absoluteTransparentPath = path.isAbsolute(edit.transparentEditPath)
        ? edit.transparentEditPath
        : path.join(/* turbopackIgnore: true */ process.cwd(), edit.transparentEditPath);

      try {
        await fs.unlink(absoluteTransparentPath);
      } catch (error) {
        console.error('Error deleting transparent edit file:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await db.delete(imageEdits).where(eq(imageEdits.id, editId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image edit:', error);
    return NextResponse.json(
      { error: 'Failed to delete image edit' },
      { status: 500 }
    );
  }
}
