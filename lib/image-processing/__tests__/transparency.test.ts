import { describe, it, expect } from 'vitest';
import { Jimp } from 'jimp';
import { intToRGBA, makeTransparent, mapSamplePoint, transparencyBodySchema } from '../transparency';

const RED = 0xff0000ff;
const BLUE = 0x0000ffff;
const CLEAR = 0x00000000;

/** Build a PNG from rows of colour ints. */
async function png(rows: number[][]): Promise<Buffer> {
  const image = new Jimp({ width: rows[0].length, height: rows.length, color: CLEAR });
  rows.forEach((row, y) => row.forEach((c, x) => image.setPixelColor(c, x, y)));
  return image.getBuffer('image/png');
}

async function alphaGrid(buffer: Buffer): Promise<number[][]> {
  const image = await Jimp.read(buffer);
  const grid: number[][] = [];
  for (let y = 0; y < image.bitmap.height; y++) {
    grid.push([]);
    for (let x = 0; x < image.bitmap.width; x++) grid[y].push(intToRGBA(image.getPixelColor(x, y)).a);
  }
  return grid;
}

const defaults = transparencyBodySchema.parse({});

describe('mapSamplePoint', () => {
  it('scales to real pixels and clamps to the image', () => {
    expect(mapSamplePoint({ x: 50, y: 50 }, { width: 200, height: 100 }, { width: 100, height: 100 })).toEqual({ x: 100, y: 50 });
    expect(mapSamplePoint({ x: -5, y: 999 }, { width: 10, height: 10 })).toEqual({ x: 0, y: 9 });
  });
});

describe('makeTransparent', () => {
  // Red border background around a blue centre pixel, plus an isolated red pixel inside the subject
  const rows = [
    [RED, RED, RED, RED, RED],
    [RED, BLUE, BLUE, BLUE, RED],
    [RED, BLUE, RED, BLUE, RED],
    [RED, BLUE, BLUE, BLUE, RED],
    [RED, RED, RED, RED, RED],
  ];

  it('global mode clears every pixel matching the corner colour', async () => {
    const result = await makeTransparent(await png(rows), { ...defaults, mode: 'global' });
    if (result.fullyTransparent) throw new Error('unexpected');
    const alpha = await alphaGrid(result.buffer);

    expect(alpha[0]).toEqual([0, 0, 0, 0, 0]);
    expect(alpha[2]).toEqual([0, 255, 0, 255, 0]); // the inner red pixel is cleared too
  });

  it('flood mode keeps enclosed pixels of the same colour', async () => {
    const result = await makeTransparent(await png(rows), { ...defaults, mode: 'flood' });
    if (result.fullyTransparent) throw new Error('unexpected');
    const alpha = await alphaGrid(result.buffer);

    expect(alpha[0]).toEqual([0, 0, 0, 0, 0]);
    expect(alpha[2]).toEqual([0, 255, 255, 255, 0]); // inner red pixel is not connected to the border
  });

  it('samples the colour at the given point, scaled from displayed dimensions', async () => {
    const result = await makeTransparent(await png(rows), {
      ...defaults,
      mode: 'global',
      samplePoint: { x: 1, y: 1 }, // displayed at half size -> pixel (2, 2)
      displayedDimensions: { width: 2.5, height: 2.5 },
    });
    if (result.fullyTransparent) throw new Error('unexpected');
    const alpha = await alphaGrid(result.buffer);

    expect(alpha[0]).toEqual([0, 0, 0, 0, 0]); // (2,2) is red, so red is cleared
  });

  it('seeds flood fill from a clamped sample point instead of reading out of bounds', async () => {
    const result = await makeTransparent(await png(rows), {
      ...defaults,
      mode: 'flood',
      samplePoint: { x: 100, y: 100 },
    });
    expect(result.fullyTransparent).toBe(false);
  });

  it('reports a fully transparent image when a sample point finds nothing visible', async () => {
    const empty = await png([[CLEAR, CLEAR], [CLEAR, CLEAR]]);
    const result = await makeTransparent(empty, { ...defaults, samplePoint: { x: 0, y: 0 } });
    expect(result).toEqual({ fullyTransparent: true });
  });

  it('snaps a transparent sample to the nearest visible colour', async () => {
    const result = await makeTransparent(await png([[CLEAR, BLUE, RED]]), {
      ...defaults,
      mode: 'global',
      tolerance: 0,
      samplePoint: { x: 0, y: 0 },
    });
    if (result.fullyTransparent) throw new Error('unexpected');
    expect(await alphaGrid(result.buffer)).toEqual([[0, 0, 255]]); // blue cleared, red kept
  });
});
