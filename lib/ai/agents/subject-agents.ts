import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { getChatModel } from '../model';

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
export async function createSubjectAgent(concept: string, model?: LanguageModel): Promise<SubjectSuggestion> {
  const resolvedModel = model ?? getChatModel();

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

  const { output } = await generateText({
    model: resolvedModel,
    system: systemPrompt,
    output: Output.object({
      schema: subjectSchema,
    }),
    prompt: `Expand this concept into a detailed subject: ${concept}`,
  });

  return output;
}
