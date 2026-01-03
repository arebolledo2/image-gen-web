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
    model: google('gemini-3-flash-preview'),
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
    model: google('gemini-3-flash-preview'),
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
    model: google('gemini-3-flash-preview'),
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
    model: google('gemini-3-flash-preview'),
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
    model: google('gemini-3-flash-preview'),
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
1. Name: MUST start with the basic concept category as a prefix, followed by a colon and a creative name. Capitalize the first letter of each word in the prefix.
2. Description: Provide a rich, detailed description that focuses on visual elements, materials, and unique features.
3. Use evocative language that helps an image generator "visualize" the subject.
4. Keep the description concise but impactful (2-3 sentences).

Examples:
Input: "mechanical spider"
Name: "Mechanical Spider: Arachno-Droid Sentinel"
Description: "A multi-legged combat automaton with polished obsidian plating and glowing crimson optical sensors. Its joints are reinforced with exposed bronze gears and hydraulic pistons, carrying a specialized energy projector on its reinforced cephalothorax."

Input: "projectile"
Name: "Projectile: Aegis Vortex Discus"
Description: "A spinning disc-shaped projectile with ethereal blue energy trails and reinforced titanium edges. The core pulses with arcane energy while aerodynamic fins stabilize its flight path."

Input: "fire elemental"
Name: "Fire Elemental: Infernal Combustion Titan"
Description: "A towering humanoid figure composed of roiling flames and molten lava, with eyes that burn like miniature suns. Embers and ash constantly swirl around its form, while its footsteps leave scorched earth in their wake."`;

  const { experimental_output } = await generateText({
    model: google('gemini-3-flash-preview'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: subjectSchema,
    }),
    prompt: `Expand this concept into a detailed subject: ${concept}`,
  });

  return experimental_output;
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
    model: google('gemini-3-flash-preview'),
    system: systemPrompt,
    prompt: `Adjust this prompt:\n\n${basePrompt}\n\nBased on this suggestion: ${suggestion}`,
  });

  return text.trim();
}

/**
 * Schema for audio prompt creation
 */
const audioPromptSchema = z.object({
  prompt: z.string().describe('A detailed, technical prompt optimized for game audio/sound effect generation'),
});

/**
 * Audio prompt suggestion returned by the AI agent
 */
export type AudioPromptSuggestion = z.infer<typeof audioPromptSchema>;

/**
 * Create a detailed audio generation prompt optimized for video game sound effects.
 *
 * Transforms simple concepts (e.g., "laser turret") into detailed, technical prompts
 * that guide AI audio generation to produce high-quality game SFX.
 *
 * @param concept - The basic concept provided by the user (e.g., "laser turret", "explosion")
 * @returns Promise resolving to validated audio prompt
 * @throws Error if AI generation fails
 *
 * @example
 * ```typescript
 * const result = await createAudioPromptAgent("laser turret");
 * console.log(result.prompt);
 * // "High-tech laser turret firing sequence: sharp electronic charge-up with rising pitch..."
 * ```
 */
export async function createAudioPromptAgent(concept: string): Promise<AudioPromptSuggestion> {
  const systemPrompt = `You are an expert sound designer for video games with extensive experience creating efficient, production-ready sound effects.

Your goal is to transform a simple concept into a clear, focused prompt for AI sound generation. Games require many varied sounds, so keep prompts simple and effective.

Guidelines:
1. Keep it concise and direct (1-2 sentences max)
2. Focus on the essential characteristics: tone, texture, impact
3. Use clear descriptive terms without over-complicating
4. Emphasize game-ready qualities (punchy, clean, reactive)
5. Avoid overly complex multi-phase descriptions unless critical
6. Think "production library" not "cinematic showcase"

Good examples:
- Input: "laser turret"
  Output: "Sharp electronic laser blast with a bright, cutting tone and quick metallic click at the start."

- Input: "explosion"
  Output: "Punchy explosion with deep bass impact and crunchy mid-range debris. Game-ready and impactful."

- Input: "enemy footsteps"
  Output: "Heavy metallic footstep with mechanical clank and subtle servo whir. Industrial and weighty."

- Input: "power-up collected"
  Output: "Bright ascending chime with sparkle. Crisp, positive, and rewarding."

- Input: "button click"
  Output: "Clean UI button click with satisfying mechanical snap. Crisp and responsive."

- Input: "enemy damage"
  Output: "Metallic impact hit with electric crackle. Sharp and punchy damage feedback."

Keep it simple, focused, and game-ready. You're building a sound library, not a film score.`;

  const { experimental_output } = await generateText({
    model: google('gemini-3-flash-preview'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: audioPromptSchema,
    }),
    prompt: `Create a detailed audio generation prompt for this concept: ${concept}`,
  });

  return experimental_output;
}

/**
 * Parameters for editing an existing style
 */
export interface EditStyleParams {
  /** The current style to modify */
  currentStyle: {
    name: string;
    description?: string | null;
    palette: {
      primary: string[];
      accent: string[];
      background: string;
    };
    renderingCues: {
      materials: string[];
      effects: string[];
      finish: string;
    };
  };
  /** User's request for how to modify the style (e.g., "make it more vibrant", "add golden accents") */
  userRequest: string;
}

/**
 * Edit an existing style based on a user request.
 *
 * The agent modifies the style according to the user's natural language request
 * while maintaining the overall structure and coherence of the style definition.
 *
 * @param params - The current style and user's modification request
 * @returns Promise resolving to the modified style definition
 * @throws Error if AI generation fails or returns invalid data
 *
 * @example
 * ```typescript
 * const modifiedStyle = await editStyleAgent({
 *   currentStyle: {
 *     name: 'Neon Synth',
 *     palette: { primary: ['#00FFFF'], accent: ['#FF00FF'], background: '#0A0A1F' },
 *     renderingCues: { materials: ['chrome'], effects: ['glow'], finish: 'glossy' }
 *   },
 *   userRequest: 'make the colors warmer and add a sunset theme'
 * });
 * // Returns modified style with warmer palette colors
 * ```
 */
export async function editStyleAgent(params: EditStyleParams): Promise<StyleSuggestion> {
  const { currentStyle, userRequest } = params;

  const systemPrompt = `You are a professional art director and style designer for game sprites and assets.
Your task is to modify an existing style definition according to a user's request while maintaining consistency and quality.

CRITICAL RULES:
1. All colors MUST be valid hex color codes (e.g., #FF5733).
2. Preserve the overall structure and coherence of the style.
3. Make targeted changes based on the user's request - don't completely overhaul unless requested.
4. Keep elements that aren't mentioned in the request relatively unchanged.
5. Ensure the modified style still works cohesively as a complete art direction.

The current style has:
- Name: ${currentStyle.name}
- Description: ${currentStyle.description || 'No description'}
- Palette: Primary ${currentStyle.palette.primary.join(', ')}, Accent ${currentStyle.palette.accent.join(', ')}, Background ${currentStyle.palette.background}
- Materials: ${currentStyle.renderingCues.materials.join(', ')}
- Effects: ${currentStyle.renderingCues.effects.join(', ')}
- Finish: ${currentStyle.renderingCues.finish}

Modify this style according to the user's request and return a complete, updated style definition.`;

  const { experimental_output } = await generateText({
    model: google('gemini-3-flash-preview'),
    system: systemPrompt,
    experimental_output: Output.object({
      schema: styleSchema,
    }),
    prompt: `Modify the style based on this request: ${userRequest}`,
  });

  return experimental_output;
}
