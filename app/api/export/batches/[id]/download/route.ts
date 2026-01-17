import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';
import { createBatchZip, sanitizeBatchName } from '@/lib/storage/zip-export';

/**
 * GET /api/export/batches/[id]/download
 *
 * Download all batch images as a ZIP archive.
 * Designed for bulk asset import into external tools.
 *
 * Query parameters:
 * - includeTransparent: boolean - Include transparent versions (default: true)
 * - includeFlipped: boolean - Include flipped versions (default: false)
 * - includeMetadata: boolean - Include metadata.json (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;

    // Extract search params - compatible with both runtime and test environments
    const url = request.nextUrl || new URL(request.url);
    const { searchParams } = url;

    // Get batch with all details
    const batch = await batchesService.getBatchWithDetails(batchId);

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Check if batch has images
    const imageCount = batch.generations?.reduce((sum, gen) => sum + (gen.images?.length || 0), 0) || 0;

    if (imageCount === 0) {
      return NextResponse.json(
        { error: 'Batch has no images to export' },
        { status: 400 }
      );
    }

    // Parse options
    const includeTransparent = searchParams.get('includeTransparent') !== 'false';
    const includeFlipped = searchParams.get('includeFlipped') === 'true';
    const includeMetadata = searchParams.get('includeMetadata') !== 'false';

    // Create ZIP
    const zipBuffer = await createBatchZip(batch, {
      includeTransparent,
      includeFlipped,
      includeMetadata,
    });

    // Generate filename
    const safeFileName = sanitizeBatchName(batch.name);
    const fileName = `${safeFileName}_${batchId.substring(0, 8)}.zip`;

    // Return ZIP file
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error creating batch ZIP:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create batch ZIP' },
      { status: 500 }
    );
  }
}
