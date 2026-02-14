import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';

/**
 * GET /api/styles/[id]/batches
 * Fetches all batches that use a specific style.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Style ID is required' },
        { status: 400 }
      );
    }

    const batches = await batchesService.getBatchesByStyleId(id);

    return NextResponse.json({ batches });
  } catch (error) {
    console.error('Error fetching batches for style:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches for style' },
      { status: 500 }
    );
  }
}
