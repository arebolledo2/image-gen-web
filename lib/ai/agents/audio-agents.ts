import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { getChatModel } from '../model';

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
 */
export async function createAudioPromptAgent(concept: string, model?: LanguageModel): Promise<AudioPromptSuggestion> {
  const resolvedModel = model ?? getChatModel();

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

  const { output } = await generateText({
    model: resolvedModel,
    system: systemPrompt,
    output: Output.object({
      schema: audioPromptSchema,
    }),
    prompt: `Create a detailed audio generation prompt for this concept: ${concept}`,
  });

  return output;
}
