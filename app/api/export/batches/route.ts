import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';

/**
 * GET /api/export/batches
 *
 * Query batches with search and filtering.
 * Designed for external tools (Claude skills, asset pipelines).
 *
 * Query parameters:
 * - search: string - Search in batch name/description
 * - status: 'draft' | 'queued' | 'running' | 'completed' | 'failed'
 * - includeImageCount: boolean - Include image count per batch
 * - limit: number - Max results (default: 20)
 * - offset: number - Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract search params - compatible with both runtime and test environments
    const url = request.nextUrl || new URL(request.url);
    const { searchParams } = url;

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as 'draft' | 'queued' | 'running' | 'completed' | 'failed' | undefined;
    const includeImageCount = searchParams.get('includeImageCount') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const batches = await batchesService.getBatches({
      search,
      status,
      includeImageCount,
      limit,
      offset,
    });

    return NextResponse.json({
      batches,
      count: batches.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching batches for export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}
