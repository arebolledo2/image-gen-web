import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';
import { handleApiError, notFound } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/batches/[id] - Get a single batch with prompts, generations and lineage
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const batch = await batchesService.getBatchWithDetails(id);
    if (!batch) throw notFound('Batch');

    return NextResponse.json({ batch });
  } catch (error) {
    return handleApiError(error, 'fetch batch');
  }
}

// DELETE /api/batches/[id] - Delete a batch and everything generated from it
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await batchesService.deleteBatch(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete batch');
  }
}
