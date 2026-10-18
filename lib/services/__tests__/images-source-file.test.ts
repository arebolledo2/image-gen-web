// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagesService } from '../images.service';

const findEdit = vi.fn();
const findAnimation = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      imageEdits: { findFirst: (...args) => findEdit(...args) },
      squishAnimations: { findFirst: (...args) => findAnimation(...args) },
    },
  },
}));
vi.mock('@/lib/db/schema', () => ({
  images: { id: 'id' },
  squishAnimations: { id: 'id' },
  imageEdits: { id: 'id' },
}));

const image = {
  id: 'img',
  filePath: 'out/a.png',
  transparentFilePath: 'out/a_transparent.png',
  flippedFilePath: null,
};

describe('ImagesService.resolveSourceFile', () => {
  let service: ImagesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImagesService();
  });

  it('resolves original and transparent versions', async () => {
    expect(await service.resolveSourceFile(image, 'original')).toEqual({ filePath: 'out/a.png', name: 'original' });
    expect(await service.resolveSourceFile(image, 'transparent')).toEqual({
      filePath: 'out/a_transparent.png',
      name: 'transparent',
    });
  });

  it('rejects versions that were never created with a 400', async () => {
    await expect(service.resolveSourceFile(image, 'flipped')).rejects.toMatchObject({ status: 400 });
    await expect(
      service.resolveSourceFile({ ...image, transparentFilePath: null }, 'transparent')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects unknown versions with a 400', async () => {
    await expect(service.resolveSourceFile(image, 'bogus')).rejects.toMatchObject({
      status: 400,
      message: 'Invalid source version',
    });
  });

  it('resolves edit-transparent- before edit-', async () => {
    findEdit.mockResolvedValue({
      id: 'e1',
      generatedName: 'Red hat',
      editedFilePath: 'out/e1.png',
      transparentEditPath: 'out/e1_transparent.png',
    });

    expect(await service.resolveSourceFile(image, 'edit-transparent-e1')).toEqual({
      filePath: 'out/e1_transparent.png',
      name: 'edit_Red_hat_transparent',
    });
    expect(await service.resolveSourceFile(image, 'edit-e1')).toEqual({
      filePath: 'out/e1.png',
      name: 'edit_Red_hat',
    });
  });

  it('returns 404 for unknown edits and animations', async () => {
    findEdit.mockResolvedValue(undefined);
    findAnimation.mockResolvedValue(undefined);

    await expect(service.resolveSourceFile(image, 'edit-x')).rejects.toMatchObject({ status: 404 });
    await expect(service.resolveSourceFile(image, 'squish-x')).rejects.toMatchObject({ status: 404 });
  });
});
