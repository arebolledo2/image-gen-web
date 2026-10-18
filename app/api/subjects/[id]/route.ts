import { NextRequest, NextResponse } from 'next/server';
import { subjectsService } from '@/lib/services';

// GET /api/subjects/[id] - Get a single subject
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subject = await subjectsService.getSubjectWithLineage(id);

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject' },
      { status: 500 }
    );
  }
}

// PATCH /api/subjects/[id] - Update a subject
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isTransparent, categoryId } = body;

    const updatedSubject = await subjectsService.updateSubject(id, {
      name,
      description,
      isTransparent,
      categoryId: categoryId === 'none' ? undefined : categoryId,
    });

    if (!updatedSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subject: updatedSubject });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}

// DELETE /api/subjects/[id] - Delete a subject
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await subjectsService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
