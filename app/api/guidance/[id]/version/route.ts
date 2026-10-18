import { NextRequest, NextResponse } from 'next/server';
import { guidanceService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

// POST /api/guidance/[id]/version - Create a new version of a guidance
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Throws a 404 ApiError if the parent does not exist
    const guidance = await guidanceService.createGuidanceVersion(id, {});
    return NextResponse.json({ guidance }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create guidance version');
  }
}
