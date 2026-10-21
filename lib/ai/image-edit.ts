import path from 'path';
import { google } from './google-client';
import { generateText } from 'ai';
import { Jimp } from 'jimp';
import {
  editOpenAIImage,
  OPENAI_IMAGE_MODEL,
  type OpenAIImageSize,
} from '@/lib/providers/openai/openai-image-client';

export interface ImageEditResult {
  buffer: Buffer;
  fullAiPrompt: string;
  generatedName: string;
  width: number;
  height: number;
  model: string;
  size: OpenAIImageSize;
  revisedPrompt?: string;
  usage?: unknown;
}

/** Pick the closest supported OpenAI output size for the source aspect ratio. */
export function getOpenAIEditSize(width: number, height: number): OpenAIImageSize {
  const ratio = width / height;
  if (ratio > 1.1) return '1536x1024';
  if (ratio < 0.9) return '1024x1536';
  return '1024x1024';
}

export function buildEditPrompt(userPrompt: string): string {
  return `Edit this image according to the following instructions:

${userPrompt}

GUIDELINES FOR BEST RESULTS:
1. Maintain the original composition and style
2. Focus on the requested changes while keeping the rest of the image consistent
3. Preserve transparency if the source image has transparency
4. Keep the same dimensions and aspect ratio
5. Ensure the edited result looks natural and cohesive

Edit instruction: ${userPrompt}`;
}

/** Ask the model for a short descriptive name for an edit. */
async function nameEdit(userPrompt: string): Promise<string> {
  const { text } = await generateText({
    model: google('gemini-3.1-flash-preview'),
    prompt: `Generate a concise descriptive name (3-5 words) for this image edit. User instruction: "${userPrompt}". Output only the name, nothing else.`,
  });
  return text.trim();
}

/**
 * Edit an image with OpenAI according to a free-text instruction and name the result.
 *
 * @param sourcePath - Absolute path of the image to edit
 * @param mimeType - Media type of the source image
 */
export async function generateAiEdit(
  sourcePath: string,
  userPrompt: string,
  mimeType: string,
  imageBuffer: Buffer
): Promise<ImageEditResult> {
  const source = await Jimp.read(imageBuffer);
  const size = getOpenAIEditSize(source.bitmap.width, source.bitmap.height);
  const fullAiPrompt = buildEditPrompt(userPrompt);

  const generated = await editOpenAIImage({
    prompt: fullAiPrompt,
    imageBuffer,
    imageName: path.basename(sourcePath),
    mimeType,
    size,
  });

  const edited = await Jimp.read(generated.buffer);
  return {
    buffer: generated.buffer,
    fullAiPrompt,
    generatedName: await nameEdit(userPrompt),
    width: edited.bitmap.width,
    height: edited.bitmap.height,
    model: OPENAI_IMAGE_MODEL,
    size,
    revisedPrompt: generated.revisedPrompt,
    usage: generated.usage,
  };
}
