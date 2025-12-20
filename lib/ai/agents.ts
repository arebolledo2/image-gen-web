import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';

// Schema for style creation
const styleSchema = z.object({
  name: z.string(),
  description: z.string(),
  palette: z.object({
    primary: z.array(z.string()),
    accent: z.array(z.string()),
    background: z.string(),
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

Your output MUST be valid JSON matching this exact structure:
{
  "name": "Style Name",
  "description": "Detailed description of the style",
  "palette": {
    "primary": ["color1", "color2"],
    "accent": ["color1", "color2"],
    "background": "color"
  },
  "renderingCues": {
    "materials": ["material1", "material2"],
    "effects": ["effect1", "effect2"],
    "finish": "finish type (glossy, matte, etc.)"
  }
}

Examples of good styles:
- Neon Synth: Electric cyan, neon magenta, deep navy; glossy metal, emissive seams, soft bloom halos
- Ceramic Toybox: Porcelain white, pastel teal, butter yellow; semi-matte ceramic, chunky toy-like seams
- Industrial Brutalist: Gunmetal, charcoal, burnt umber; heavy rivets, welded plates, oily grime

Be creative and specific with color names and material descriptions.`;

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    prompt: `Create a style based on: ${description}`,
  });

  // Parse and validate the JSON response
  const parsed = JSON.parse(result.text);
  return styleSchema.parse(parsed);
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

Your output MUST be valid JSON matching this structure:
{
  "name": "Prompt Name",
  "template": "The complete prompt text",
  "tags": ["tag1", "tag2", "tag3"]
}

Good examples:
- "4x4 sprite sheet of robot turret with neon synth style, rotating animation showing 16 frames of rotation, cyan spire glowing, chrome teal metal, top-down view centered in each frame, magenta background, consistent turret size throughout grid"
- "Robot turret, wide hexagonal base with glowing cyan spire, chrome and teal metal, futuristic sci-fi style, top-down view centered in frame, magenta background"`;

  const userPrompt = `Create a prompt for:
Asset Type: ${assetType}
${styleName ? `Style: ${styleName}` : ''}
${styleKeywords?.length ? `Style Keywords: ${styleKeywords.join(', ')}` : ''}
${description ? `Description: ${description}` : ''}`;

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    prompt: userPrompt,
  });

  // Parse and validate the JSON response
  const parsed = JSON.parse(result.text);
  return promptSchema.parse(parsed);
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
4. Are suitable for generating diverse sprite variations

Return ONLY a JSON array of strings, each being a complete prompt variation.`;

  const result = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    prompt: `Create ${count} variations of this prompt:\n\n${basePrompt}`,
  });

  // Parse and return array
  return JSON.parse(result.text) as string[];
}
