import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { getChatModel } from '../model';

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
export async function createBatchMetadataAgent(promptText: string, model?: LanguageModel): Promise<BatchMetadataSuggestion> {
  const resolvedModel = model ?? getChatModel();

  const systemPrompt = `You are an expert at organizing and naming game asset batches.
Given the image generation prompt(s) for a batch, create a catchy, professional name and a brief description for the batch.

Focus on game development themes like turrets, enemies, environments, or specific styles.
The name should be concise (3-6 words) and the description should be 1-2 sentences summarizing the visual theme.`;

  const { output } = await generateText({
    model: resolvedModel,
    system: systemPrompt,
    output: Output.object({
      schema: batchMetadataSchema,
    }),
    prompt: `Generate batch metadata based on this prompt: ${promptText}`,
  });

  return output;
}
