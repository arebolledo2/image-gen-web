/**
 * Image Transparency API Route
 * Note: Uses `any` for dynamic Jimp pixel data.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tolerance = body.tolerance ?? 30;
    const mode = body.mode ?? 'global'; // 'global' or 'flood'
    const samplePoint = body.samplePoint as { x: number, y: number } | undefined;
    const forceOriginal = body.forceOriginal === true;

    const imageRecord = await db.query.images.findFirst({
      where: eq(images.id, id),
    });

    if (!imageRecord) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Decide which file to load: original or already transparent one
    // If we are sampling a point, we might want to start from original to avoid weird artifacts,
    // but usually users want to ADD transparency.
    // HOWEVER, if it's already transparent, we should load the transparent one so we can see the transparency.
    const filePathToLoad = (!forceOriginal && imageRecord.transparentFilePath) || imageRecord.filePath;

    const absolutePath = path.isAbsolute(filePathToLoad)
      ? filePathToLoad
      : path.join(process.cwd(), filePathToLoad);

    const image = await (Jimp as any).read(absolutePath);
    
    // Ensure image is RGBA
    if (image.bitmap.alpha === false) {
      image.bitmap.alpha = true;
    }
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Helper to convert Jimp 32-bit int to RGBA
    const intToRGBA = (i: number) => {
      return {
        r: (i >> 24) & 0xFF,
        g: (i >> 16) & 0xFF,
        b: (i >> 8) & 0xFF,
        a: i & 0xFF
      };
    };

    // Get target color
    let targetR: number;
    let targetG: number;
    let targetB: number;

    if (samplePoint) {
      const color = intToRGBA(image.getPixelColor(samplePoint.x, samplePoint.y));

      // Check if the sampled pixel is already fully transparent
      if (color.a === 0) {
        return NextResponse.json({
          success: false,
          message: 'Cannot sample from a fully transparent pixel. Please click on a visible area.',
          alreadyTransparent: true,
          transparentFilePath: imageRecord.transparentFilePath
        }, { status: 200 });
      }

      targetR = color.r;
      targetG = color.g;
      targetB = color.b;
    } else {
      // Get corner pixels to detect background color
      const corners = [
        intToRGBA(image.getPixelColor(0, 0)),
        intToRGBA(image.getPixelColor(width - 1, 0)),
        intToRGBA(image.getPixelColor(0, height - 1)),
        intToRGBA(image.getPixelColor(width - 1, height - 1))
      ];

      targetR = Math.round(corners.reduce((sum, p) => sum + p.r, 0) / 4);
      targetG = Math.round(corners.reduce((sum, p) => sum + p.g, 0) / 4);
      targetB = Math.round(corners.reduce((sum, p) => sum + p.b, 0) / 4);
    }

    if (mode === 'flood') {
      // Flood fill approach
      const visited = new Uint8Array(width * height);
      const queue: [number, number][] = [];

      if (samplePoint) {
        queue.push([samplePoint.x, samplePoint.y]);
        visited[samplePoint.y * width + samplePoint.x] = 1;
      } else {
        // Default to corners
        const corners: [number, number][] = [
          [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
        ];
        corners.forEach(([x, y]) => {
          queue.push([x, y]);
          visited[y * width + x] = 1;
        });
      }

      let head = 0;
      while (head < queue.length) {
        const [x, y] = queue[head++];
        
        // Process current pixel
        const color = intToRGBA(image.getPixelColor(x, y));
        
        // If it's already transparent, we should still spread if it was reached,
        // but it doesn't count as a match for color matching if we are looking for a specific color.
        // Actually, if it's transparent, we just continue spreading to non-transparent matches.
        
        const isMatch = 
          Math.abs(color.r - targetR) <= tolerance &&
          Math.abs(color.g - targetG) <= tolerance &&
          Math.abs(color.b - targetB) <= tolerance;

        if (isMatch || color.a === 0) {
          if (isMatch) {
            // Make transparent by setting alpha to 0
            const transparentColor = (image.getPixelColor(x, y) & 0xFFFFFF00) >>> 0;
            image.setPixelColor(transparentColor, x, y);
          }

          // Check neighbors
          const neighbors = [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = ny * width + nx;
              if (!visited[idx]) {
                visited[idx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }
      }
    } else {
      // Global scan approach
      image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        const isMatch = 
          Math.abs(r - targetR) <= tolerance &&
          Math.abs(g - targetG) <= tolerance &&
          Math.abs(b - targetB) <= tolerance;

        if (isMatch) {
          this.bitmap.data[idx + 3] = 0; // Alpha
        }
      });
    }

    const transparentBuffer = await image.getBuffer('image/png');

    // Save the new file
    const ext = path.extname(imageRecord.fileName);
    const baseName = path.basename(imageRecord.fileName, ext);
    const transparentFileName = `${baseName}_transparent.png`;
    
    const dirName = path.dirname(imageRecord.filePath);
    const transparentFilePath = path.join(dirName, transparentFileName);
    
    const absoluteTransparentPath = path.isAbsolute(transparentFilePath)
      ? transparentFilePath
      : path.join(process.cwd(), transparentFilePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(absoluteTransparentPath), { recursive: true });

    await fs.writeFile(absoluteTransparentPath, transparentBuffer);

    // Update DB
    await db
      .update(images)
      .set({ transparentFilePath: transparentFilePath })
      .where(eq(images.id, id));

    return NextResponse.json({ 
      success: true, 
      transparentFilePath: transparentFilePath 
    });

  } catch (error) {
    console.error('Error making image transparent:', error);
    return NextResponse.json(
      { error: 'Failed to process transparency: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
