import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { composePromptFromIds } from '@/lib/ai/prompt-composition';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseAgentBody } from "@/lib/ai/request-config";
import { promptsService } from '@/lib/services';
import { buildAgentErrorResponse } from "../utils";

const composePromptRequestShape = {
  styleId: z.string().optional(),
  subjectId: z.string().trim().min(1, "subjectId is required"),
  guidanceIds: z.array(z.string()).optional(),
  promptStyle: z.enum(['terse', 'verbose']).optional(),
};

// POST /api/agents/compose-prompt
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const { styleId, subjectId, guidanceIds, promptStyle, aiConfig: resolvedConfig } =
      await parseAgentBody(request, composePromptRequestShape);
    aiConfig = resolvedConfig;

    const { promptText, subject, guidance } = await composePromptFromIds(
      { subjectId, styleId, guidanceIds, promptStyle },
      getChatModelForConfig(aiConfig),
    );

    // Persist the prompt so batches can be filtered by the subject's category
    const createdPrompt = await promptsService.saveComposedPrompt({
      name: `${subject.name} prompt`,
      styleId: styleId || null,
      subjectId,
      promptText,
      guidanceIds: guidance.map(g => g.id),
    });

    return NextResponse.json({ promptText, promptId: createdPrompt.id });
  } catch (error) {
    console.error('Error composing prompt:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to compose prompt");
  }
}
