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
        : path.join(/* turbopackIgnore: true */ process.cwd(), sourcePath);

    // Convert to relative path for consistent thumbnail directory structure
    // This ensures thumbnails work regardless of whether source path is absolute or relative
    const relativeSourcePath = path.isAbsolute(sourcePath)
        ? path.relative(process.cwd(), sourcePath)
        : sourcePath;

    // Generate thumbnail path: source_dir/thumbnails/width_filename
    const dir = path.dirname(relativeSourcePath);
    const fileName = path.basename(relativeSourcePath);
    const thumbnailDir = path.join(dir, 'thumbnails');
    const thumbnailPath = path.join(thumbnailDir, `${width}_${fileName}`);

    const absoluteThumbnailPath = path.join(/* turbopackIgnore: true */ process.cwd(), thumbnailPath);

    // Check if thumbnail already exists
    try {
        await fs.access(absoluteThumbnailPath);
        return thumbnailPath;
    } catch {
        // Continue to generation
    }

    // Ensure thumbnail directory exists
    await fs.mkdir(absoluteThumbnailPath.replace(path.basename(absoluteThumbnailPath), ''), { recursive: true });

    try {
        // Generate thumbnail
        // Note: Jimp 1.6.0 uses static read method
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
