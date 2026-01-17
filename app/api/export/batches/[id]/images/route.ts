import { NextRequest, NextResponse } from 'next/server';
import { imagesService, batchesService } from '@/lib/services';

/**
 * GET /api/export/batches/[id]/images
 *
 * Get all images for a batch with download URLs.
 * Designed for external tools to browse and download batch assets.
 *
 * Returns images with:
 * - Full metadata
 * - Download URLs (original, transparent, thumbnail)
 * - Batch prompt context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: batchId } = await params;

    // Verify batch exists
    const batch = await batchesService.findById(batchId);
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Get all images for the batch
    const images = await imagesService.getImagesByBatch(batchId);

    // Map to export format with download URLs
    const imagesWithUrls = images.map(img => ({
      id: img.id,
      fileName: img.fileName,
      fileSize: img.fileSize,
      metadata: img.metadata,
      isFavorite: img.isFavorite,
      createdAt: img.createdAt,

      // Download URLs
      downloadUrl: `/api/images/${img.id}/file?version=original`,
      transparentUrl: img.transparentFilePath
        ? `/api/images/${img.id}/file?version=transparent`
        : null,
      flippedUrl: img.flippedFilePath
        ? `/api/images/${img.id}/file?version=flipped`
        : null,
      thumbnailUrl: `/api/images/${img.id}/file?size=thumbnail`,

      // Batch context
      promptText: img.generation?.batchPrompt?.promptText || null,
      generationStatus: img.generation?.status || null,
    }));

    return NextResponse.json({
      batchId,
      batchName: batch.name,
      batchStatus: batch.status,
      images: imagesWithUrls,
      count: imagesWithUrls.length,
    });
  } catch (error) {
    console.error('Error fetching batch images for export:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch batch images' },
      { status: 500 }
    );
  }
}
