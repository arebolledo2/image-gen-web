import { describe, it, expect } from 'vitest';
import { Jimp } from 'jimp';
import { squishScale, generateSquishSpritesheet } from '../squish';
import { flipHorizontal } from '../flip';

async function solidPng(width: number, height: number): Promise<Buffer> {
  const image = new Jimp({ width, height, color: 0xff0000ff });
  return image.getBuffer('image/png');
}

describe('squishScale', () => {
  it('starts at rest for both animation types', () => {
    expect(squishScale(0, 8, 50, 'bounce')).toEqual({ scaleX: 1, scaleY: 1 });
    expect(squishScale(0, 8, 50, 'squash_stretch')).toEqual({ scaleX: 1, scaleY: 1 });
  });

  it('preserves volume for squash_stretch', () => {
    const { scaleX, scaleY } = squishScale(4, 8, 40, 'squash_stretch');
    expect(scaleX * scaleY).toBeCloseTo(1);
    expect(scaleY).toBeLessThan(1);
  });

  it('compresses vertically and widens slightly for bounce', () => {
    const { scaleX, scaleY } = squishScale(3, 8, 30, 'bounce');
    expect(scaleY).toBeLessThan(1);
    expect(scaleX).toBeGreaterThan(1);
  });
});

describe('generateSquishSpritesheet', () => {
  it('produces a horizontal sheet with one frame per step', async () => {
    const result = await generateSquishSpritesheet(await solidPng(10, 20), {
      frameCount: 4,
      intensity: 20,
      animationType: 'bounce',
    });
    expect(result).toMatchObject({ frameWidth: 10, frameHeight: 20, width: 40, height: 20 });

    const decoded = await Jimp.read(result.buffer);
    expect(decoded.bitmap.width).toBe(40);
    expect(decoded.bitmap.height).toBe(20);
  });
});

describe('flipHorizontal', () => {
  it('mirrors pixels left-to-right', async () => {
    const image = new Jimp({ width: 2, height: 1, color: 0x00000000 });
    image.setPixelColor(0xff0000ff, 0, 0);
    const flipped = await Jimp.read(await flipHorizontal(await image.getBuffer('image/png')));

    expect(flipped.getPixelColor(1, 0)).toBe(0xff0000ff);
    expect(flipped.getPixelColor(0, 0)).toBe(0x00000000);
  });
});
