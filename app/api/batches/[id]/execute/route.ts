import { NextRequest, NextResponse } from 'next/server';
import { batchExecutionService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

export const runtime = 'nodejs';

// POST /api/batches/[id]/execute - Execute a batch
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await batchExecutionService.executeBatch(id);

    return NextResponse.json({
      success: true,
      message: `Batch queued with ${result.jobsQueued} jobs`,
      batchId: id,
    });
  } catch (error) {
    return handleApiError(error, 'queue batch');
  }
}
