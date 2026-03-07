import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { getChatModel } from '../model';

// Schema for style creation
export const styleSchema = z.object({
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
 */
export async function createStyleAgent(description: string, model?: LanguageModel): Promise<StyleSuggestion> {
  const resolvedModel = model ?? getChatModel();

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

  const { output } = await generateText({
    model: resolvedModel,
    system: systemPrompt,
    output: Output.object({
      schema: styleSchema,
    }),
    prompt: `Create a style based on: ${description}`,
  });

  return output;
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
 */
export async function editStyleAgent(params: EditStyleParams, model?: LanguageModel): Promise<StyleSuggestion> {
  const resolvedModel = model ?? getChatModel();
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

  const { output } = await generateText({
    model: resolvedModel,
    system: systemPrompt,
    output: Output.object({
      schema: styleSchema,
    }),
    prompt: `Modify the style based on this request: ${userRequest}`,
  });

  return output;
}
