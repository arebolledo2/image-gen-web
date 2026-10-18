import { Jimp } from 'jimp';

export const SQUISH_FRAME_COUNTS = [4, 8, 12, 16] as const;
export type SquishAnimationType = 'bounce' | 'squash_stretch';

export interface SquishOptions {
  frameCount: number;
  /** 0-100 percentage */
  intensity: number;
  animationType: SquishAnimationType;
}

export interface SquishResult {
  buffer: Buffer;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
}

/** Scale factors for frame `index` of `frameCount`. Pure, for easy testing. */
export function squishScale(
  index: number,
  frameCount: number,
  intensity: number,
  animationType: SquishAnimationType
): { scaleX: number; scaleY: number } {
  const t = index / frameCount;
  const k = intensity / 100;

  if (animationType === 'squash_stretch') {
    // Vertical compression with horizontal expansion, volume preserved
    const squish = Math.sin(Math.PI * t) ** 2;
    const scaleY = 1 - k * squish;
    return { scaleX: 1 / scaleY, scaleY };
  }

  // Simple bounce: sine wave with slight decay
  const bounce = Math.sin(Math.PI * t) * (1 - t * 0.3);
  return { scaleX: 1 + k * bounce * 0.3, scaleY: 1 - k * bounce };
}

/** Build a horizontal sprite sheet of squish frames, anchored to the bottom. */
export async function generateSquishSpritesheet(
  source: string | Buffer,
  { frameCount, intensity, animationType }: SquishOptions
): Promise<SquishResult> {
  const original = await Jimp.read(source as string);
  const { width, height } = original.bitmap;
  const spritesheet = new Jimp({ width: width * frameCount, height, color: 0x00000000 });

  for (let i = 0; i < frameCount; i++) {
    const { scaleX, scaleY } = squishScale(i, frameCount, intensity, animationType);
    const newWidth = Math.round(width * scaleX);
    const newHeight = Math.round(height * scaleY);

    const scaled = original.clone().resize({ w: newWidth, h: newHeight });
    const frame = new Jimp({ width, height, color: 0x00000000 });
    frame.composite(scaled, Math.round((width - newWidth) / 2), height - newHeight);
    spritesheet.composite(frame, i * width, 0);
  }

  return {
    buffer: await spritesheet.getBuffer('image/png'),
    frameWidth: width,
    frameHeight: height,
    width: width * frameCount,
    height,
  };
}
