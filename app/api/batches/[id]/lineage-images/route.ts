import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';
import { handleApiError, notFound } from '@/lib/api/errors';

// GET /api/batches/[id]/lineage-images - Get images from parent batches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requested = Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 20;

    const lineage = await batchesService.getLineageImages(id, limit);
    if (!lineage) throw notFound('Batch');

    return NextResponse.json(lineage);
  } catch (error) {
    return handleApiError(error, 'fetch lineage images');
  }
}
