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
  artisticDirection: z.object({
    visualStyle: z.string().describe('e.g., "Stylized Cartoon", "Photorealistic", "Cyberpunk Anime", "Hand-painted 2D"'),
    lighting: z.string().describe('e.g., "Dramatic cinematic lighting with rim lights", "Flat ambient occlusion"'),
    cameraPerspective: z.string().describe('e.g., "Orthographic top-down", "Slightly angled 3/4 perspective"'),
    levelOfDetail: z.string().describe('e.g., "High detail with micro-textures", "Clean simple shapes"'),
  }),
  renderingCues: z.object({
    materials: z.array(z.string()),
    effects: z.array(z.string()),
    finish: z.string(),
  }),
});

/**
 * Style suggestion returned by the AI agent
 */
export type StyleSuggestion = z.infer<typeof styleSchema>;

/**
 * Create a complete style definition using AI based on a text description.
 *
 * The agent generates:
 * - Color palette with valid hex codes (#RRGGBB format)
 * - Material descriptions (e.g., "glossy metal", "matte plastic")
 * - Visual effects (e.g., "soft bloom", "emissive seams")
 * - Surface finish description
 *
 * All generated colors are validated to be proper hex format.
 *
 * @param description - Natural language description of desired style (e.g., "futuristic neon cyberpunk")
 * @returns Promise resolving to validated style definition with palette and rendering cues
 * @throws Error if AI generation fails or returns invalid data
 *
 * @example
 * ```typescript
 * const style = await createStyleAgent("retro 8-bit pixel art");
 * console.log(style.palette.primary); // ["#FF0000", "#00FF00"]
 * console.log(style.renderingCues.materials); // ["pixelated", "chunky"]
 * ```
 */
export async function createStyleAgent(description: string): Promise<StyleSuggestion> {
  const systemPrompt = `You are a professional art director and style designer for game sprites and assets.
Your goal is to create deep, rich, and consistent style definitions that guide AI image generation to produce cohesive results.

CRITICAL:
1. All colors MUST be valid hex color codes (e.g., #FF5733).
2. Descriptions must be technical and evocative to ensure consistency across different subjects.
3. Be explicit about the artistic direction to avoid variance in "look and feel".

Examples of high-quality style definitions:

- Neon Synth:
  - Visual Style: Cyberpunk 3D render with high-contrast stylized aesthetics.
  - Lighting: Dramatic cinematic lighting, high-intensity neon emissives, strong rim lighting to separate subject from background.
  - Camera: Orthographic top-down, perfectly centered.
  - Level of Detail: Medium-high, focusing on clean geometric shapes and sharp edges.
  - Materials: Glossy black chrome, translucent colored plastics, brushed metal.
  - Effects: Bloom halos around emissives, digital noise, chromatic aberration.
  - Palette: #00FFFF (Cyan), #FF00FF (Magenta), #0000FF (Blue), #FF1493 (Hot Pink).

- Hand-Painted Fantasy:
  - Visual Style: 2D hand-painted illustrative style, soft brushwork, no outlines.
  - Lighting: Warm directional light, soft ambient shadows, magical glow effects.
  - Camera: Slightly angled 3/4 perspective for depth.
  - Level of Detail: Painterly detail, focusing on texture and color transitions rather than micro-geometry.
  - Materials: Weathered wood, hammered iron, aged parchment.
  - Effects: Particle dust, soft glow, watercolor bleed edges.
  - Palette: #8B4513 (Saddle Brown), #DAA520 (Goldenrod), #228B22 (Forest Green).

- Retro Pixel Ops:
  - Visual Style: High-fidelity pixel art, limited color palette, chunky silhouettes.
  - Lighting: Sharp 1-bit style highlights, dithered shadows.
  - Camera: Strict 2D side-on or top-down.
  - Level of Detail: Pixel-perfect precision, every pixel matters.
  - Materials: Matte metal, rubberized grips, glowing LEDs.
  - Effects: Dithering, sprite-flicker, scanline overlays.
  - Palette: #1A1A1A (Black), #33FF33 (Retro Green), #FF3333 (Retro Red).

Provide a complete definition that captures the essence of the requested style.`;

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
 *
 * @example
 * ```typescript
 * const prompt = await createPromptAgent({
 *   assetType: "turret",
 *   styleName: "Neon Synth",
 *   styleKeywords: ["chrome", "glowing"],
 *   description: "rotating animation",
 *   isTransparent: true
 * });
 * console.log(prompt.template);
 * // "4x4 sprite sheet of robot turret, neon synth style, chrome glowing, rotating..."
 * ```
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

/**
 * Generate variations of a base prompt while maintaining core elements.
 *
 * Variations will:
 * - Keep the same subject and general style
 * - Vary specific features, colors, or viewing angles
 * - Conditionally maintain "solid bright magenta background #FF00FF single tone with no gradients" for sprite compatibility
 * - Be suitable for creating diverse but cohesive sprite sets
 *
 * @param basePrompt - The original prompt to create variations from
 * @param count - Number of variations to generate (default: 3)
 * @param isTransparent - Whether the variations should have a transparent background (magenta)
 * @returns Promise resolving to array of prompt variations
 * @throws Error if AI generation fails
 *
 * @example
 * ```typescript
 * const variations = await suggestPromptVariations(
 *   "Red robot turret, top-down view, solid bright magenta background (#FF00FF) single tone with no gradients",
 *   3,
 *   true
 * );
 * // Returns variations like:
 * // - "Blue robot turret, top-down view, solid bright magenta background (#FF00FF) single tone with no gradients"
 * // - "Red robot turret, angled view, solid bright magenta background (#FF00FF) single tone with no gradients"
 * // - "Red robot turret with spikes, top-down view, solid bright magenta background (#FF00FF) single tone with no gradients"
 * ```
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

/**
 * Parameters for composing a constructed prompt
 */
export interface ComposePromptParams {
  subject: {
    name: string;
    description?: string | null;
    isTransparent?: boolean;
  };
  style: {
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
- Aim for a narrative, detailed description of the scene and asset.`
    : `OUTPUT STYLE: TERSE
- Use brief descriptions.
- Use lots of commas to separate ideas.
- Keep it to a single paragraph.
- Follow the structure: [SUBJECT], [FEATURES], [COLORS], [STYLE], [VIEW], [ANIMATION], [OUTLINE], [BACKGROUND]`;

  const systemPrompt = `You are an expert at creating technical prompts for AI image generation, specifically for game assets.
Your task is to take a high-level Subject, a Style, and multiple Guidance instructions and compose them into a single, cohesive, high-quality prompt.

CRITICAL RULES:
1. ${backgroundInstruction}
2. Be specific about view angle if implied by guidance or subject.
3. Request consistent sizing for sprite sheets if "sprite sheet" is mentioned in guidance.
4. Integrate the style's palette and rendering cues naturally.
5. ${styleInstruction}`;

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

  const userPrompt = `Compose a prompt with these components:
Subject: ${subject.name} ${subject.description ? `(${subject.description})` : ''}
Style: ${style.name}
Style Details:${artisticText}
- Palette: ${paletteText}
- Materials: ${materialsText}
${effectsText ? `- Effects: ${effectsText}` : ''}
Guidance:
${guidance.map(g => `- ${g.name}: ${g.description}`).join('\n')}`;

  const { text } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text.trim();
}

/**
 * Schema for batch metadata (name and description)
 */
const batchMetadataSchema = z.object({
  name: z.string().describe('A catchy name for the batch of images (e.g., "Arctic Expedition Turrets")'),
  description: z.string().describe('A brief, descriptive summary of what this batch contains'),
});

/**
 * Batch metadata suggestion returned by the AI agent
 */
export type BatchMetadataSuggestion = z.infer<typeof batchMetadataSchema>;

/**
 * Create batch name and description using AI based on the prompt(s) text.
 *
 * @param promptText - The prompt text that defines the content of the batch
 * @returns Promise resolving to validated batch metadata
 */
export async function createBatchMetadataAgent(promptText: string): Promise<BatchMetadataSuggestion> {
  const systemPrompt = `You are an expert at organizing and naming game asset batches.
Given the image generation prompt(s) for a batch, create a catchy, professional name and a brief description for the batch.

Focus on game development themes like turrets, enemies, environments, or specific styles.
The name should be concise (3-6 words) and the description should be 1-2 sentences summarizing the visual theme.`;

  const { experimental_output } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: batchMetadataSchema,
    }),
    prompt: `Generate batch metadata based on this prompt: ${promptText}`,
  });

  return experimental_output;
}

/**
 * Schema for subject creation
 */
const subjectSchema = z.object({
  name: z.string().describe('A creative and descriptive name for the game asset'),
  description: z.string().describe('A detailed and evocative description of the asset, focusing on visual features'),
});

/**
 * Subject suggestion returned by the AI agent
 */
export type SubjectSuggestion = z.infer<typeof subjectSchema>;

/**
 * Create a detailed subject name and description based on a basic concept.
 *
 * @param concept - The basic concept provided by the user (e.g., "mechanical spider")
 * @returns Promise resolving to validated subject suggestion
 */
export async function createSubjectAgent(concept: string): Promise<SubjectSuggestion> {
  const systemPrompt = `You are a creative lead and concept artist for a game studio.
Your goal is to take a simple concept and expand it into a detailed, evocative subject for image generation.

Guidelines:
1. Name: Create a professional and thematic name that fits a game world.
2. Description: Provide a rich, detailed description that focuses on visual elements, materials, and unique features.
3. Use evocative language that helps an image generator "visualize" the subject.
4. Keep the description concise but impactful (2-3 sentences).

Example:
Input: "mechanical spider"
Name: "Arachno-Droid Sentinel"
Description: "A multi-legged combat automaton with polished obsidian plating and glowing crimson optical sensors. Its joints are reinforced with exposed bronze gears and hydraulic pistons, carrying a specialized energy projector on its reinforced cephalothorax."`;

  const { experimental_output } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: subjectSchema,
    }),
    prompt: `Expand this concept into a detailed subject: ${concept}`,
  });

  return experimental_output;
}
