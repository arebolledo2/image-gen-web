import type { LanguageModel } from 'ai';
import { composeConstructedPromptAgent } from '@/lib/ai/agents';
import { promptsService } from '@/lib/services';

export interface ComposePromptInput {
  subjectId: string;
  styleId?: string | null;
  guidanceIds?: string[];
  promptStyle?: 'terse' | 'verbose';
}

/**
 * Load a subject, optional style and guidance by id and have the AI compose a prompt from them.
 *
 * @throws ApiError 404 when the subject or style does not exist
 */
export async function composePromptFromIds(input: ComposePromptInput, model: LanguageModel) {
  const { subject, style, guidance } = await promptsService.loadCompositionInputs(input);

  const promptText = await composeConstructedPromptAgent(
    {
      subject: {
        name: subject.name,
        description: subject.description,
        isTransparent: subject.isTransparent,
      },
      style: style
        ? {
            name: style.name,
            description: style.description,
            palette: style.palette,
            renderingCues: style.renderingCues,
          }
        : undefined,
      guidance: guidance.map(g => ({ name: g.name, description: g.description })),
      promptStyle: input.promptStyle,
    },
    model,
  );

  return { promptText, subject, style, guidance };
}
