import { Jimp } from 'jimp';

/** Flip an image horizontally and return PNG bytes. */
export async function flipHorizontal(source: string | Buffer): Promise<Buffer> {
  const image = await Jimp.read(source as string);
  image.flip({ horizontal: true, vertical: false });
  return image.getBuffer('image/png');
}
