import { NextRequest, NextResponse } from 'next/server';
import { subjectsService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

// POST /api/subjects/[id]/version - Create a new version of a subject
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subject = await subjectsService.createSubjectVersion(id, {});

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create subject version');
  }
}
