import fs from 'fs/promises';
import path from 'path';
import { resolveStoragePath } from './resolve-path';

const OUTPUT_DIR = process.env.OUTPUT_DIR || '../image-gen/outputs';

/**
 * Ensure a directory exists, creating it recursively if needed.
 *
 * @param dirPath - Absolute path to directory
 */
export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save an image file to local storage with organized directory structure.
 *
 * Files are saved to: `{OUTPUT_DIR}/batches/{batchId}/{generationId}_{timestamp}.{ext}`
 *
 * @param file - File object with uint8Array data and mediaType
 * @param batchId - ID of the batch (used for directory organization)
 * @param generationId - ID of the generation (used in filename)
 * @returns Promise resolving to relative file path from project root
 *
 * @example
 * ```typescript
 * const path = await saveImage(
 *   { uint8Array: imageData, mediaType: 'image/png' },
 *   'batch-123',
 *   'gen-456'
 * );
 * // Returns: "../image-gen/outputs/batches/batch-123/gen-456_1234567890.png"
 * ```
 */
export async function saveImage(
  file: { uint8Array: Uint8Array; mediaType: string },
  batchId: string,
  generationId: string
): Promise<string> {
  // Create directory structure: outputs/batches/{batchId}/
  const batchDir = path.join(OUTPUT_DIR, 'batches', batchId);
  await ensureDirectoryExists(batchDir);

  // Generate filename
  const extension = file.mediaType.split('/')[1] || 'png';
  const timestamp = Date.now();
  const fileName = `${generationId}_${timestamp}.${extension}`;
  const filePath = path.join(batchDir, fileName);

  // Write file
  await fs.writeFile(filePath, file.uint8Array);

  // Return relative path for storage in database
  return path.relative(process.cwd(), filePath);
}

/**
 * Write a derived file (transparent version, flip, ...) to a stored path, creating directories as needed.
 *
 * @param filePath - Absolute or project-relative destination path
 * @param data - File contents
 */
export async function writeStoredFile(filePath: string, data: Buffer): Promise<void> {
  const absolutePath = resolveStoragePath(filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, data);
}

/**
 * Read an image file from storage.
 *
 * @param filePath - Absolute or relative path to image file
 * @returns Promise resolving to file buffer
 */
export async function readImage(filePath: string): Promise<Buffer> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);

  return await fs.readFile(absolutePath);
}

/**
 * Delete an image file from storage.
 *
 * @param filePath - Absolute or relative path to image file
 */
export async function deleteImage(filePath: string): Promise<void> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);

  await fs.unlink(absolutePath);
}

/**
 * Get file statistics for an image.
 *
 * @param filePath - Absolute or relative path to image file
 * @returns Promise resolving to file stats (size, timestamps)
 */
export async function getImageStats(filePath: string) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);

  const stats = await fs.stat(absolutePath);
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}
