import { NextRequest, NextResponse } from 'next/server';
import { stylesService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

// POST /api/styles/[id]/version - Create a new version of a style
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Throws a 404 ApiError if the parent does not exist
    const style = await stylesService.createStyleVersion(id, {});
    return NextResponse.json({ style }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create style version');
  }
}
