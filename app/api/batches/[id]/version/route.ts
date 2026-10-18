import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

// POST /api/batches/[id]/version - Create a new draft version of a batch
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Copies the prompts; throws a 404 ApiError if the parent does not exist
    const batch = await batchesService.createBatchVersion(id, {});
    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create batch version');
  }
}
