import { generateText, Output } from 'ai';
import { geminiFlash } from '../model';
import { z } from 'zod';

// Schema for prompt creation
const promptSchema = z.object({
  name: z.string(),
  template: z.string(),
  tags: z.array(z.string()),
});

/**
 * Prompt suggestion returned by the AI agent
 */
export type PromptSuggestion = z.infer<typeof promptSchema>;

/**
 * Parameters for creating a prompt template
 */
export interface CreatePromptAgentParams {
  /** Type of game asset (e.g., "turret", "enemy", "power-up") */
  assetType: string;
  /** Optional name of style to apply */
  styleName?: string;
  /** Optional keywords from the style (e.g., ["chrome", "glowing"]) */
  styleKeywords?: string[];
  /** Optional additional description of desired output */
  description?: string;
  /** Whether the asset should have a transparent background (magenta) */
  isTransparent?: boolean;
}

/**
 * Parameters for composing a constructed prompt
 */
export interface ComposePromptParams {
  subject: {
    name: string;
    description?: string | null;
    isTransparent?: boolean;
  };
  style?: {
    name: string;
    description?: string | null;
    palette: string[] | {
      primary: string[];
      accent: string[];
    };
    artisticDirection?: {
      visualStyle: string;
      lighting: string;
      cameraPerspective: string;
      levelOfDetail: string;
    };
    renderingCues: string[] | {
      materials: string[];
      effects: string[];
    };
  };
  guidance: Array<{
    name: string;
    description: string;
  }>;
  promptStyle?: 'terse' | 'verbose';
}

/**
 * Create a prompt template for AI image generation using an AI agent.
 *
 * The agent follows best practices for game sprite generation:
 * - Conditionally includes "solid bright magenta background #FF00FF single tone with no gradients" for sprite transparency
 * - Specifies view angle (top-down, side view, etc.)
 * - Incorporates style keywords when provided
 * - Requests consistent sizing for sprite sheets
 *
 * @param params - Configuration for prompt creation
 * @returns Promise resolving to prompt template with name and tags
 * @throws Error if AI generation fails
 */
export async function createPromptAgent(params: CreatePromptAgentParams): Promise<PromptSuggestion> {
  const { assetType, styleName, styleKeywords, description, isTransparent = true } = params;

  const backgroundInstruction = isTransparent
    ? 'ALWAYS include "solid bright magenta background #FF00FF single tone with no gradients" for sprite transparency'
    : 'Include a background description that fits the subject and style, but DO NOT use a magenta background.';

  const systemPrompt = `You are an expert at creating prompts for AI image generation.
Create prompts for game sprites following this template structure:

[SUBJECT], [FEATURES], [COLORS], [STYLE], [VIEW], [ANIMATION], [OUTLINE], [BACKGROUND]

CRITICAL RULES:
1. ${backgroundInstruction}
2. Be specific about view angle (top-down, side view, etc.)
3. Include style keywords if provided
4. Request consistent sizing for sprite sheets
5. For 4x4 sprite sheets, describe 16 frames of animation progression

Good examples:
- "4x4 sprite sheet of robot turret with neon synth style, rotating animation showing 16 frames of rotation, cyan spire glowing, chrome teal metal, top-down view centered in each frame, solid bright magenta background (#FF00FF) single tone with no gradients, consistent turret size throughout grid"
- "Robot turret, wide hexagonal base with glowing cyan spire, chrome and teal metal, futuristic sci-fi style, top-down view centered in frame, solid bright magenta background (#FF00FF) single tone with no gradients"`;

  const userPrompt = `Create a prompt for:
Asset Type: ${assetType}
${styleName ? `Style: ${styleName}` : ''}
${styleKeywords?.length ? `Style Keywords: ${styleKeywords.join(', ')}` : ''}
${description ? `Description: ${description}` : ''}`;

  const { output } = await generateText({
    model: geminiFlash,
    system: systemPrompt,
    output: Output.object({
      schema: promptSchema,
    }),
    prompt: userPrompt,
  });

  return output;
}

/**
 * Generate variations of a base prompt while maintaining core elements.
 *
 * @param basePrompt - The original prompt to create variations from
 * @param count - Number of variations to generate (default: 3)
 * @param isTransparent - Whether the variations should have a transparent background (magenta)
 * @returns Promise resolving to array of prompt variations
 * @throws Error if AI generation fails
 */
export async function suggestPromptVariations(
  basePrompt: string,
  count: number = 3,
  isTransparent: boolean = true
): Promise<string[]> {
  const backgroundInstruction = isTransparent
    ? 'Keep "solid bright magenta background #FF00FF single tone with no gradients" for transparency'
    : 'Ensure the background is consistent with the base prompt but DO NOT use a magenta background.';

  const systemPrompt = `You are an expert at creating variations of prompts for AI image generation.
Given a base prompt, create ${count} variations that:
1. Maintain the core subject and style
2. Vary specific features, colors, or angles
3. ${backgroundInstruction}
4. Are suitable for generating diverse sprite variations`;

  const { output } = await generateText({
    model: geminiFlash,
    system: systemPrompt,
    output: Output.object({
      schema: z.object({
        variations: z.array(z.string()),
      }),
    }),
    prompt: `Create ${count} variations of this prompt:\n\n${basePrompt}`,
  });

  return output.variations;
}

/**
 * AI Agent to compose a final image generation prompt from building blocks.
 */
export async function composeConstructedPromptAgent(params: ComposePromptParams): Promise<string> {
  const { subject, style, guidance, promptStyle = 'terse' } = params;

  const backgroundInstruction = subject.isTransparent !== false
    ? 'ALWAYS include "solid bright magenta background #FF00FF single tone with no gradients" for sprite transparency unless explicitly told otherwise.'
    : 'Include a background description that fits the subject and style, but DO NOT use a magenta background.';

  const styleInstruction = promptStyle === 'verbose'
    ? `OUTPUT STYLE: VERBOSE
- Use full, descriptive sentences.
- Use periods to separate ideas.
- Use new lines (line breaks) to separate logical sections of the prompt.
- Aim for a narrative, detailed description of the scene and asset.
- AVOID redundancy: Ensure information from the style or guidance is integrated naturally and not repeated across different sections.`
    : `OUTPUT STYLE: TERSE
- Use brief descriptions.
- Use lots of commas to separate ideas.
- Keep it to a single paragraph.
- Follow the structure: [SUBJECT], [FEATURES], [COLORS], [STYLE], [VIEW], [ANIMATION], [OUTLINE], [BACKGROUND]`;

  const systemPrompt = `You are an expert at creating technical prompts for AI image generation, specifically for game assets.
Your task is to take a high-level Subject, ${style ? 'a Style, ' : ''}and${guidance.length > 0 ? ' multiple ' : ' '}Guidance instructions and compose them into a single, cohesive, high-quality prompt.

CRITICAL RULES:
1. ${backgroundInstruction}
2. Be specific about view angle if implied by guidance or subject.
3. Request consistent sizing for sprite sheets if "sprite sheet" is mentioned in guidance.
${style ? '4. Integrate the style\'s palette and rendering cues naturally.\n' : ''}5. ${styleInstruction}
6. ONLY output the final prompt text. Do not include any conversational filler, introductions, or explanations.`;

  let userPrompt = `Compose a prompt with these components:
Subject: ${subject.name} ${subject.description ? `(${subject.description})` : ''}`;

  if (style) {
    const paletteText = Array.isArray(style.palette)
      ? style.palette.join(', ')
      : `${style.palette.primary.join(', ')}, ${style.palette.accent.join(', ')}`;

    const materialsText = Array.isArray(style.renderingCues)
      ? style.renderingCues.join(', ')
      : style.renderingCues.materials.join(', ');

    const effectsText = Array.isArray(style.renderingCues)
      ? '' // When it's a flat array, cues are mixed together in materialsText
      : style.renderingCues.effects.join(', ');

    const artisticText = style.artisticDirection
      ? `
- Visual Style: ${style.artisticDirection.visualStyle}
- Lighting: ${style.artisticDirection.lighting}
- Perspective: ${style.artisticDirection.cameraPerspective}
- Level of Detail: ${style.artisticDirection.levelOfDetail}`
      : '';

    userPrompt += `
Style: ${style.name}
Style Details:${artisticText}
- Palette: ${paletteText}
- Materials: ${materialsText}
${effectsText ? `- Effects: ${effectsText}` : ''}`;
  }

  if (guidance.length > 0) {
    userPrompt += `
Guidance:
${guidance.map(g => `- ${g.name}: ${g.description}`).join('\n')}`;
  }

  const { text } = await generateText({
    model: geminiFlash,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text.trim();
}

/**
 * Adjust an existing prompt based on a quick suggestion.
 * Optionally uses reference image prompts to guide the adjustment.
 */
export async function adjustPromptAgent(
  basePrompt: string,
  suggestion: string,
  promptStyle: 'terse' | 'verbose' | 'audio' = 'terse',
  referencePrompts?: string[]
): Promise<string> {
  const isAudio = promptStyle === 'audio';

  const styleInstruction = isAudio
    ? `AUDIO SOUND DESIGN STYLE:
- Focus on tone, texture, impact, and game-readiness.
- Keep it concise and direct (1-2 sentences).
- Use clear descriptive terms for sound (punchy, clean, resonant, crunchy).
- AVOID image-specific terms like "isometric", "magenta", "transparent background", or "view angle".`
    : promptStyle === 'verbose'
      ? `OUTPUT STYLE: VERBOSE
- Use full, descriptive sentences.
- Use periods to separate ideas.
- Use new lines (line breaks) to separate logical sections of the prompt.
- Aim for a narrative, detailed description of the scene and asset.
- AVOID redundancy: Ensure information is integrated naturally and not repeated across different sections.`
      : `OUTPUT STYLE: TERSE
- Use brief descriptions.
- Use lots of commas to separate ideas.
- Keep it to a single paragraph.
- Follow the structure: [SUBJECT], [FEATURES], [COLORS], [STYLE], [VIEW], [ANIMATION], [OUTLINE], [BACKGROUND]`;

  const referenceContext = referencePrompts && referencePrompts.length > 0
    ? `\n\nYou have been provided with reference prompts from images the user likes. Use these as inspiration for style, tone, and visual elements:\n${referencePrompts.map((p, i) => `Reference ${i + 1}: ${p}`).join('\n')}`
    : '';

  const systemPrompt = isAudio
    ? `You are an expert sound designer for video games.
Your task is to refine an existing audio generation prompt based on a user's suggestion.
Keep the prompt focused on sound characteristics (tone, texture, impact) and maintain the original intent while incorporating the new suggestion.

CRITICAL RULES:
1. ${styleInstruction}
2. ONLY output the final adjusted prompt text.
3. DO NOT include any image-related instructions (no colors, no perspectives, no transparency).`
    : `You are an expert at refining and adjusting AI image generation prompts for game assets.
Your task is to take an existing prompt and modify it according to a user's suggestion while maintaining the overall intent and quality.
${referenceContext}

CRITICAL RULES:
1. Preserve technical instructions like "solid bright magenta background #FF00FF" if they are present in the base prompt.
2. Integrate the new suggestion naturally into the existing structure.
3. ${referencePrompts && referencePrompts.length > 0 ? 'Draw inspiration from the reference prompts for visual style, colors, and details that work well.' : ''}
4. ${styleInstruction}
5. ONLY output the final prompt text. Do not include any conversational filler, explanations, or "Here is the modified prompt:".`;

  const { text } = await generateText({
    model: geminiFlash,
    system: systemPrompt,
    prompt: `Adjust this prompt:\n\n${basePrompt}\n\nBased on this suggestion: ${suggestion}`,
  });

  return text.trim();
}
