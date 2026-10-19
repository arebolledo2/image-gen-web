import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { promptsService } from '@/lib/services';
import { composePromptFromIds } from '@/lib/ai/prompt-composition';
import { getChatModelForConfig, resolveAIRequestConfig } from '@/lib/ai/model';
import { handleApiError, parseBody } from '@/lib/api/errors';

const REQUIRED = 'Name, styleId, and subjectId are required';

const createPromptSchema = z.object({
  name: z.string({ error: REQUIRED }).trim().min(1, REQUIRED),
  styleId: z.string({ error: REQUIRED }).min(1, REQUIRED),
  subjectId: z.string({ error: REQUIRED }).min(1, REQUIRED),
  guidanceIds: z.array(z.string()).optional(),
  promptStyle: z.enum(['terse', 'verbose']).optional(),
});

// GET /api/prompts - List all prompts
export async function GET() {
  try {
    const prompts = await promptsService.getAllPromptsWithRelations();
    return NextResponse.json({ prompts });
  } catch (error) {
    return handleApiError(error, 'fetch prompts');
  }
}

// POST /api/prompts - Compose a prompt with the AI and save it
export async function POST(request: NextRequest) {
  try {
    const { name, styleId, subjectId, guidanceIds, promptStyle } = await parseBody(request, createPromptSchema);

    const { promptText } = await composePromptFromIds(
      { subjectId, styleId, guidanceIds, promptStyle },
      getChatModelForConfig(resolveAIRequestConfig()),
    );
    const prompt = await promptsService.saveComposedPrompt({ name, styleId, subjectId, promptText, guidanceIds });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create prompt');
  }
}
