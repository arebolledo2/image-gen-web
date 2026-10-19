import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { adjustPromptAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseAgentBody } from "@/lib/ai/request-config";
import { promptsService } from '@/lib/services';
import { buildAgentErrorResponse } from "../utils";

const adjustPromptRequestShape = {
  basePrompt: z.string().trim().min(1, "basePrompt and suggestion are required"),
  suggestion: z.string().trim().min(1, "basePrompt and suggestion are required"),
  promptStyle: z.enum(['terse', 'verbose', 'audio']).optional(),
  referenceImageIds: z.array(z.string()).optional(),
};

// POST /api/agents/adjust-prompt
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const body = await parseAgentBody(request, adjustPromptRequestShape);
    aiConfig = body.aiConfig;

    const referencePrompts = await promptsService.getReferencePromptTexts(body.referenceImageIds ?? []);

    const adjustedPrompt = await adjustPromptAgent(
      body.basePrompt,
      body.suggestion,
      body.promptStyle ?? 'terse',
      referencePrompts.length > 0 ? referencePrompts : undefined,
      getChatModelForConfig(aiConfig),
    );

    return NextResponse.json({ promptText: adjustedPrompt });
  } catch (error) {
    console.error('Error adjusting prompt:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to adjust prompt");
  }
}
