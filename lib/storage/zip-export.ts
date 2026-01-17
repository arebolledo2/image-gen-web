/**
 * ZIP export utilities for batch downloads.
 *
 * NOTE: Requires jszip package. Install with:
 * npm install jszip
 */
import JSZip from 'jszip';
import { readImage } from './local-storage';

/**
 * Batch with details for ZIP export
 */
export interface BatchWithDetails {
  id: string;
  name: string;
  status: string;
  batchPrompts?: Array<{
    promptText: string;
  }>;
  generations?: Array<{
    status: string;
    images: Array<{
      id: string;
      fileName: string;
      filePath: string;
      transparentFilePath?: string | null;
      flippedFilePath?: string | null;
    }>;
  }>;
}

/**
 * Create a ZIP archive of all images in a batch
 *
 * @param batch - Batch with images
 * @param options - Export options
 * @returns ZIP file as Buffer
 */
export async function createBatchZip(
  batch: BatchWithDetails,
  options: {
    includeTransparent?: boolean;
    includeFlipped?: boolean;
    includeMetadata?: boolean;
  } = {}
): Promise<Buffer> {
  const { includeTransparent = true, includeFlipped = false, includeMetadata = true } = options;

  const zip = new JSZip();

  // Add metadata file
  if (includeMetadata) {
    const metadata = {
      batchId: batch.id,
      batchName: batch.name,
      batchStatus: batch.status,
      exportedAt: new Date().toISOString(),
      prompts: batch.batchPrompts?.map(bp => bp.promptText) || [],
      imageCount: batch.generations?.reduce((sum, gen) => sum + gen.images.length, 0) || 0,
    };

    zip.file('metadata.json', JSON.stringify(metadata, null, 2));
  }

  // Create folders for organization
  const originalFolder = zip.folder('original');
  const transparentFolder = includeTransparent ? zip.folder('transparent') : null;
  const flippedFolder = includeFlipped ? zip.folder('flipped') : null;

  // Add all images
  let imageIndex = 1;
  for (const generation of batch.generations || []) {
    for (const image of generation.images) {
      try {
        // Add original image
        const originalBuffer = await readImage(image.filePath);
        const ext = image.fileName.split('.').pop() || 'png';
        const baseName = `image_${imageIndex.toString().padStart(3, '0')}`;

        originalFolder?.file(`${baseName}.${ext}`, originalBuffer);

        // Add transparent version if requested and exists
        if (includeTransparent && image.transparentFilePath) {
          try {
            const transparentBuffer = await readImage(image.transparentFilePath);
            transparentFolder?.file(`${baseName}.${ext}`, transparentBuffer);
          } catch (err) {
            console.warn(`Failed to add transparent version for ${image.fileName}:`, err);
          }
        }

        // Add flipped version if requested and exists
        if (includeFlipped && image.flippedFilePath) {
          try {
            const flippedBuffer = await readImage(image.flippedFilePath);
            flippedFolder?.file(`${baseName}.${ext}`, flippedBuffer);
          } catch (err) {
            console.warn(`Failed to add flipped version for ${image.fileName}:`, err);
          }
        }

        imageIndex++;
      } catch (error) {
        console.error(`Failed to add image ${image.fileName} to ZIP:`, error);
        // Continue with other images
      }
    }
  }

  // Generate ZIP
  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6, // Balance between size and speed
    },
  });
}

/**
 * Sanitize batch name for use as filename
 *
 * @param name - Batch name
 * @returns Safe filename
 */
export function sanitizeBatchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50) || 'batch';
}
