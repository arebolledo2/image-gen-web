import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs/promises';

/**
 * Generate a thumbnail for an image and save it to a cache directory.
 * 
 * @param sourcePath Relative or absolute path to the source image
 * @param width Target width for the thumbnail (default 256)
 * @returns Path to the generated thumbnail relative to project root
 */
export async function getThumbnail(sourcePath: string, width: number = 512): Promise<string> {
    const absoluteSourcePath = path.isAbsolute(sourcePath)
        ? sourcePath
        : path.join(process.cwd(), sourcePath);

    // Generate thumbnail path: source_dir/thumbnails/width_filename
    const dir = path.dirname(sourcePath);
    const fileName = path.basename(sourcePath);
    const thumbnailDir = path.join(dir, 'thumbnails');
    const thumbnailPath = path.join(thumbnailDir, `${width}_${fileName}`);

    const absoluteThumbnailPath = path.isAbsolute(thumbnailPath)
        ? thumbnailPath
        : path.join(process.cwd(), thumbnailPath);

    // Check if thumbnail already exists
    try {
        await fs.access(absoluteThumbnailPath);
        return thumbnailPath;
    } catch {
        // Continue to generation
    }

    // Ensure thumbnail directory exists
    const absoluteThumbnailDir = path.join(process.cwd(), thumbnailDir);
    await fs.mkdir(absoluteThumbnailDir, { recursive: true });

    try {
        // Generate thumbnail
        // Note: Jimp 1.6.0 uses (Jimp as any).read for compatibility in some environments
        const image = await (Jimp as any).read(absoluteSourcePath);

        // Resize maintaining aspect ratio
        image.resize({ w: width });

        // Always save as PNG for transparency support if needed
        const buffer = await image.getBuffer('image/png');
        await fs.writeFile(absoluteThumbnailPath, buffer);

        return thumbnailPath;
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Fallback to original image if thumbnail generation fails
        return sourcePath;
    }
}
