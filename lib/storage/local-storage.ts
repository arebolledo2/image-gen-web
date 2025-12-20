import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = process.env.OUTPUT_DIR || '../image-gen/outputs';

export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

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

export async function readImage(filePath: string): Promise<Buffer> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  return await fs.readFile(absolutePath);
}

export async function deleteImage(filePath: string): Promise<void> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  await fs.unlink(absolutePath);
}

export async function getImageStats(filePath: string) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  const stats = await fs.stat(absolutePath);
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}
