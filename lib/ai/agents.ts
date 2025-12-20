import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';

// Schema for style creation
const styleSchema = z.object({
  name: z.string(),
  description: z.string(),
  palette: z.object({
    primary: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Hex color code (e.g., #FF5733)')),
    accent: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Hex color code (e.g., #00FFFF)')),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('Hex color code (e.g., #FFFFFF)'),
  }),
  renderingCues: z.object({
    materials: z.array(z.string()),
    effects: z.array(z.string()),
    finish: z.string(),
  }),
});

export type StyleSuggestion = z.infer<typeof styleSchema>;

export async function createStyleAgent(description: string): Promise<StyleSuggestion> {
  const systemPrompt = `You are a style designer for game sprites and assets.
Create a complete style definition including palette and rendering cues based on the user's description.

CRITICAL: All colors MUST be valid hex color codes (e.g., #FF5733, #00FFFF, #1A1A1A).

Examples of good styles with proper hex codes:
- Neon Synth:
  - Primary: #00FFFF (electric cyan), #FF00FF (neon magenta)
  - Accent: #0000FF (electric blue), #FF1493 (hot pink)
  - Background: #0A0A1F (deep navy)
  - Materials: glossy metal, chrome
  - Effects: emissive seams, soft bloom halos

- Ceramic Toybox:
  - Primary: #F5F5F0 (porcelain white), #87CEEB (pastel teal)
  - Accent: #FFE4B5 (butter yellow), #FFB6C1 (light pink)
  - Background: #FFFFFF (white)
  - Materials: semi-matte ceramic, smooth plastic
  - Effects: chunky toy-like seams, soft shadows

- Industrial Brutalist:
  - Primary: #2F4F4F (gunmetal), #36454F (charcoal)
  - Accent: #8B4513 (burnt umber), #CD7F32 (bronze)
  - Background: #1C1C1C (dark gray)
  - Materials: heavy rivets, welded plates
  - Effects: oily grime, rust streaks

Be creative and specific with material and effect descriptions, but ALWAYS use valid hex color codes.`;

  const { experimental_output } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: styleSchema,
    }),
    prompt: `Create a style based on: ${description}`,
  });

  return experimental_output;
}

// Schema for prompt creation
const promptSchema = z.object({
  name: z.string(),
  template: z.string(),
  tags: z.array(z.string()),
});

export type PromptSuggestion = z.infer<typeof promptSchema>;

export async function createPromptAgent(params: {
  assetType: string;
  styleName?: string;
  styleKeywords?: string[];
  description?: string;
}): Promise<PromptSuggestion> {
  const { assetType, styleName, styleKeywords, description } = params;

  const systemPrompt = `You are an expert at creating prompts for AI image generation.
Create prompts for game sprites following this template structure:

[SUBJECT], [FEATURES], [COLORS], [STYLE], [VIEW], [ANIMATION], [OUTLINE], [BACKGROUND]

CRITICAL RULES:
1. ALWAYS include "magenta background" for sprite transparency
2. Be specific about view angle (top-down, side view, etc.)
3. Include style keywords if provided
4. Request consistent sizing for sprite sheets
5. For 4x4 sprite sheets, describe 16 frames of animation progression

Good examples:
- "4x4 sprite sheet of robot turret with neon synth style, rotating animation showing 16 frames of rotation, cyan spire glowing, chrome teal metal, top-down view centered in each frame, magenta background, consistent turret size throughout grid"
- "Robot turret, wide hexagonal base with glowing cyan spire, chrome and teal metal, futuristic sci-fi style, top-down view centered in frame, magenta background"`;

  const userPrompt = `Create a prompt for:
Asset Type: ${assetType}
${styleName ? `Style: ${styleName}` : ''}
${styleKeywords?.length ? `Style Keywords: ${styleKeywords.join(', ')}` : ''}
${description ? `Description: ${description}` : ''}`;

  const { experimental_output } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: promptSchema,
    }),
    prompt: userPrompt,
  });

  return experimental_output;
}

export async function suggestPromptVariations(
  basePrompt: string,
  count: number = 3
): Promise<string[]> {
  const systemPrompt = `You are an expert at creating variations of prompts for AI image generation.
Given a base prompt, create ${count} variations that:
1. Maintain the core subject and style
2. Vary specific features, colors, or angles
3. Keep "magenta background" for transparency
4. Are suitable for generating diverse sprite variations`;

  const { experimental_output } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: z.object({
        variations: z.array(z.string()),
      }),
    }),
    prompt: `Create ${count} variations of this prompt:\n\n${basePrompt}`,
  });

  return experimental_output.variations;
}
