import { Jimp } from 'jimp';
import { z } from 'zod';

export const transparencyBodySchema = z.object({
  tolerance: z.number().min(0).max(255).default(30),
  /** `global` clears every matching pixel, `flood` only regions connected to the seed(s) */
  mode: z.enum(['global', 'flood']).default('global'),
  /** Pixel to sample the background colour from; defaults to the average of the four corners */
  samplePoint: z.object({ x: z.number(), y: z.number() }).optional(),
  /** Size the client displayed the image at, used to scale `samplePoint` to the real pixels */
  displayedDimensions: z.object({ width: z.number().positive(), height: z.number().positive() }).optional(),
  /** Start from the original file even if a transparent version exists */
  forceOriginal: z.boolean().default(false),
});

export type TransparencyOptions = z.infer<typeof transparencyBodySchema>;

export type TransparencyResult =
  | { fullyTransparent: false; buffer: Buffer }
  | { fullyTransparent: true };

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Convert a Jimp 32-bit RGBA int to channels. */
export function intToRGBA(i: number): RGBA {
  return { r: (i >>> 24) & 0xff, g: (i >>> 16) & 0xff, b: (i >>> 8) & 0xff, a: i & 0xff };
}

const withinTolerance = (c: Pick<RGBA, 'r' | 'g' | 'b'>, target: Pick<RGBA, 'r' | 'g' | 'b'>, tolerance: number) =>
  Math.abs(c.r - target.r) <= tolerance &&
  Math.abs(c.g - target.g) <= tolerance &&
  Math.abs(c.b - target.b) <= tolerance;

/** Scale a client-side point to image pixels and clamp it inside the image. */
export function mapSamplePoint(
  point: { x: number; y: number },
  image: { width: number; height: number },
  displayed?: { width: number; height: number }
): { x: number; y: number } {
  let { x, y } = point;
  if (displayed && (displayed.width !== image.width || displayed.height !== image.height)) {
    x = Math.round(x * (image.width / displayed.width));
    y = Math.round(y * (image.height / displayed.height));
  }
  return {
    x: Math.max(0, Math.min(x, image.width - 1)),
    y: Math.max(0, Math.min(y, image.height - 1)),
  };
}

type Bitmap = Awaited<ReturnType<typeof Jimp.read>>;

/** Find the closest non-transparent pixel to (x, y), searching in expanding square rings. */
function findNearestVisible(image: Bitmap, x: number, y: number): RGBA | null {
  const { width, height } = image.bitmap;
  const maxRadius = Math.max(width, height);

  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only the ring's edge, not its interior
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const color = intToRGBA(image.getPixelColor(nx, ny));
        if (color.a > 0) return color;
      }
    }
  }
  return null;
}

function averageCorners(image: Bitmap): RGBA {
  const { width, height } = image.bitmap;
  const corners = [
    image.getPixelColor(0, 0),
    image.getPixelColor(width - 1, 0),
    image.getPixelColor(0, height - 1),
    image.getPixelColor(width - 1, height - 1),
  ].map(intToRGBA);
  const avg = (key: 'r' | 'g' | 'b') => Math.round(corners.reduce((sum, c) => sum + c[key], 0) / corners.length);
  return { r: avg('r'), g: avg('g'), b: avg('b'), a: 255 };
}

function floodClear(image: Bitmap, seeds: [number, number][], target: RGBA, tolerance: number): void {
  const { width, height } = image.bitmap;
  const visited = new Uint8Array(width * height);
  const queue: [number, number][] = [];
  for (const [x, y] of seeds) {
    queue.push([x, y]);
    visited[y * width + x] = 1;
  }

  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    const raw = image.getPixelColor(x, y);
    const color = intToRGBA(raw);
    const isMatch = withinTolerance(color, target, tolerance);

    // Keep spreading through matching pixels and through ones that are already transparent
    if (!isMatch && color.a !== 0) continue;
    if (isMatch) image.setPixelColor((raw & 0xffffff00) >>> 0, x, y);

    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = ny * width + nx;
      if (visited[idx]) continue;
      visited[idx] = 1;
      queue.push([nx, ny]);
    }
  }
}

function globalClear(image: Bitmap, target: RGBA, tolerance: number): void {
  const data = image.bitmap.data;
  for (let i = 0; i < data.length; i += 4) {
    if (withinTolerance({ r: data[i], g: data[i + 1], b: data[i + 2] }, target, tolerance)) {
      data[i + 3] = 0;
    }
  }
}

/**
 * Make the background of an image transparent by colour matching.
 *
 * Returns `fullyTransparent: true` when a sample point was given but the image has no visible pixel to sample.
 */
export async function makeTransparent(
  source: string | Buffer,
  options: Omit<TransparencyOptions, 'forceOriginal'>
): Promise<TransparencyResult> {
  const { tolerance, mode, samplePoint, displayedDimensions } = options;
  const image = await Jimp.read(source as string);
  const { width, height } = image.bitmap;

  let target: RGBA;
  let seeds: [number, number][];

  if (samplePoint) {
    const point = mapSamplePoint(samplePoint, { width, height }, displayedDimensions);
    let color = intToRGBA(image.getPixelColor(point.x, point.y));
    if (color.a === 0) {
      const nearest = findNearestVisible(image, point.x, point.y);
      if (!nearest) return { fullyTransparent: true };
      color = nearest;
    }
    target = color;
    seeds = [[point.x, point.y]];
  } else {
    target = averageCorners(image);
    seeds = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  }

  if (mode === 'flood') floodClear(image, seeds, target, tolerance);
  else globalClear(image, target, tolerance);

  return { fullyTransparent: false, buffer: await image.getBuffer('image/png') };
}
