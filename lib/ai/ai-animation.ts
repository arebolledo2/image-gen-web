import path from 'path';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { Jimp } from 'jimp';
import { editOpenAIImage, OPENAI_IMAGE_MODEL } from '@/lib/providers/openai/openai-image-client';

export const AI_ANIMATION_GRID_SIZES = [2, 3, 4] as const;
const AI_ANIMATION_SIZE = '1024x1024';

export interface AiAnimationResult {
  buffer: Buffer;
  fullAiPrompt: string;
  frameCount: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  model: string;
  size: string;
  revisedPrompt?: string;
  usage?: unknown;
}

export function buildAnimationPrompt(prompt: string, gridSize: number): string {
  const frameCount = gridSize * gridSize;
  return `Generate a ${gridSize}x${gridSize} grid sprite sheet (${frameCount} frames total) for this animation:

${prompt}

ANIMATION GUIDELINES:
1. Create a ${gridSize}x${gridSize} grid of frames arranged in a square layout
2. Each frame should show progressive motion/transformation with incremental changes
3. Frames should be arranged left-to-right, top-to-bottom (reading order)
4. Aim for consistency across all frames:
   - Consistent art style, shading, and lighting
   - Similar color palette throughout
   - Shared level of detail
   - Consistent character size and proportions
5. Keep the sprite centered in each frame
6. Seek smooth transitions between frames:
   - Changes between consecutive frames should be gradual
   - Avoid sudden jumps in position or appearance
   - The first and last frames should ideally connect for looping
7. Preserve transparency using magenta #FF00FF background
8. The output should be a single square image containing the grid of animation frames
9. Stability is important - avoid excessive style shifts between frames
10. Make motion feel fluid across the sequence

Animation: ${prompt}
Total frames: ${frameCount}
Grid layout: ${gridSize} rows × ${gridSize} columns

Tip: Smooth, consistent changes usually produce the best animation results.`;
}

/** Generate an AI animation sprite sheet (square grid of frames) from a source sprite. */
export async function generateAiAnimation(
  sourcePath: string,
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  gridSize: number
): Promise<AiAnimationResult> {
  const fullAiPrompt = buildAnimationPrompt(prompt, gridSize);
  const generated = await editOpenAIImage({
    prompt: fullAiPrompt,
    imageBuffer,
    imageName: path.basename(sourcePath),
    mimeType,
    size: AI_ANIMATION_SIZE,
  });

  const sheet = await Jimp.read(generated.buffer);
  const { width, height } = sheet.bitmap;
  return {
    buffer: generated.buffer,
    fullAiPrompt,
    frameCount: gridSize * gridSize,
    width,
    height,
    frameWidth: Math.floor(width / gridSize),
    frameHeight: Math.floor(height / gridSize),
    model: OPENAI_IMAGE_MODEL,
    size: AI_ANIMATION_SIZE,
    revisedPrompt: generated.revisedPrompt,
    usage: generated.usage,
  };
}

const SUGGESTION_SYSTEM_PROMPT = `You are an animation expert analyzing game sprite images. Based on what you SEE in the image, suggest a creative animation description.

CRITICAL RULES:
1. Carefully LOOK at the image and describe what you actually see
2. Suggest a brief, clear animation description (1-2 sentences max)
3. Focus on actions that make sense for what you see in the sprite
4. Be specific about motion (e.g., "walks forward" not just "moves")
5. Consider the visual style and shape of the sprite
6. ONLY output the animation description. No conversational filler.
7. Base your suggestion on the VISUAL content, not just the metadata

Good examples:
- For a robot enemy: "The robot walks forward with mechanical precision, each leg lifting and placing deliberately."
- For a turret: "The turret rotates smoothly while its barrel recoils from firing energy blasts."
- For a flying drone: "The drone hovers with subtle bobbing motion while its propellers spin continuously."
`;

/** Ask a vision model to suggest an animation for a sprite. */
export async function suggestAnimation(options: {
  imageBuffer: Buffer;
  mimeType: string;
  subjectName: string;
  styleName: string;
}): Promise<string> {
  const { imageBuffer, mimeType, subjectName, styleName } = options;
  const userPrompt = `Analyze this game sprite image (Subject: ${subjectName}, Style: ${styleName}) and suggest a creative animation that would work as a sprite sheet with 4-16 frames. Base your suggestion on what you actually see in the image.`;

  const { text } = await generateText({
    model: google('gemini-3.1-flash-preview'),
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text', text: SUGGESTION_SYSTEM_PROMPT + '\n\n' + userPrompt },
          { type: 'image', image: `data:${mimeType};base64,${imageBuffer.toString('base64')}` },
        ],
      },
    ],
  });

  return text.trim();
}
