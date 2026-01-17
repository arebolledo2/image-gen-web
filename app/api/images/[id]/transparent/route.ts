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
      // Get displayed dimensions from request (browser-side natural dimensions)
      const displayedDimensions = body.displayedDimensions as { width: number, height: number } | undefined;

      // Scale coordinates if the displayed image differs from actual file dimensions
      let scaledX = samplePoint.x;
      let scaledY = samplePoint.y;

      if (displayedDimensions && (displayedDimensions.width !== width || displayedDimensions.height !== height)) {
        const scaleX = width / displayedDimensions.width;
        const scaleY = height / displayedDimensions.height;
        scaledX = Math.round(samplePoint.x * scaleX);
        scaledY = Math.round(samplePoint.y * scaleY);
        console.log('[API Sampling Debug] Scaling coordinates:', {
          original: samplePoint,
          displayedDimensions,
          actualDimensions: { width, height },
          scale: { x: scaleX, y: scaleY },
          scaled: { x: scaledX, y: scaledY },
        });
      }

      console.log('[API Sampling Debug]', {
        samplePoint: { x: scaledX, y: scaledY },
        filePathToLoad,
        imageDimensions: { width, height },
        inBounds: scaledX >= 0 && scaledX < width && scaledY >= 0 && scaledY < height,
      });

      // Clamp coordinates to valid range to prevent reading outside image bounds
      const clampedX = Math.max(0, Math.min(scaledX, width - 1));
      const clampedY = Math.max(0, Math.min(scaledY, height - 1));

      let color = intToRGBA(image.getPixelColor(clampedX, clampedY));

      console.log('[API Sampling Debug] Pixel color at coordinates:', {
        requested: samplePoint,
        clamped: { x: clampedX, y: clampedY },
        color,
        source: 'transparent file',
      });

      // If the sampled pixel is transparent, search for the nearest visible pixel
      if (color.a === 0) {
        console.log('[API Sampling Debug] Pixel is transparent, searching for nearest visible pixel');

        // Search in expanding rings for the nearest non-transparent pixel
        let foundColor: { r: number; g: number; b: number; a: number } | null = null;
        let foundAt: { x: number; y: number } | null = null;
        const maxSearchRadius = Math.max(width, height); // Search entire image if needed

        searchLoop:
        for (let radius = 1; radius <= maxSearchRadius; radius++) {
          // Check pixels in a square ring at distance 'radius'
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              // Only check pixels on the edge of the square (not interior)
              if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

              const nx = clampedX + dx;
              const ny = clampedY + dy;

              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const neighborColor = intToRGBA(image.getPixelColor(nx, ny));
                if (neighborColor.a > 0) {
                  foundColor = neighborColor;
                  foundAt = { x: nx, y: ny };
                  console.log('[API Sampling Debug] Found visible pixel at radius', radius);
                  break searchLoop;
                }
              }
            }
          }
        }

        if (foundColor && foundAt) {
          console.log('[API Sampling Debug] Found nearest visible pixel:', {
            at: foundAt,
            color: foundColor,
            distanceFromClick: Math.max(Math.abs(foundAt.x - clampedX), Math.abs(foundAt.y - clampedY)),
          });
          color = foundColor;
        } else {
          console.log('[API Sampling Debug] No visible pixel found in entire image! Image may be fully transparent.');
          return NextResponse.json({
            success: false,
            message: 'The entire image appears to be transparent. Please click directly on a visible area.',
            alreadyTransparent: true,
            transparentFilePath: imageRecord.transparentFilePath
          }, { status: 200 });
        }
      }

      targetR = color.r;
      targetG = color.g;
      targetB = color.b;

      console.log('[API Sampling Debug] Target color for transparency:', {
        r: targetR, g: targetG, b: targetB
      });
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
      image.scan(0, 0, width, height, function (this: any, x: number, y: number, idx: number) {
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
