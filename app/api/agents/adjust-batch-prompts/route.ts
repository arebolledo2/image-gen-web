import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { adjustPromptAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseAgentBody } from "@/lib/ai/request-config";
import { batchesService, promptsService } from '@/lib/services';
import { buildAgentErrorResponse } from "../utils";

const adjustBatchPromptsRequestShape = {
  batchId: z.string().trim().min(1, "batchId and suggestion are required"),
  suggestion: z.string().trim().min(1, "batchId and suggestion are required"),
  promptStyle: z.enum(['terse', 'verbose', 'audio']).optional(),
  referenceImageIds: z.array(z.string()).optional(),
};

// POST /api/agents/adjust-batch-prompts
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const { batchId, suggestion, promptStyle, referenceImageIds, aiConfig: resolvedConfig } =
      await parseAgentBody(request, adjustBatchPromptsRequestShape);
    aiConfig = resolvedConfig;
    const chatModel = getChatModelForConfig(aiConfig);

    const prompts = await batchesService.getDraftBatchPrompts(batchId);
    const referencePrompts = await promptsService.getReferencePromptTexts(referenceImageIds ?? []);

    // Adjust all prompts in parallel, then save them together
    const adjustedPrompts = await Promise.all(
      prompts.map(async (prompt) => ({
        id: prompt.id,
        promptText: await adjustPromptAgent(
          prompt.promptText,
          suggestion,
          promptStyle ?? 'terse',
          referencePrompts.length > 0 ? referencePrompts : undefined,
          chatModel,
        ),
      }))
    );

    await batchesService.saveAdjustedPrompts(adjustedPrompts);

    return NextResponse.json({ prompts: adjustedPrompts });
  } catch (error) {
    console.error('Error adjusting batch prompts:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to adjust batch prompts");
  }
}
