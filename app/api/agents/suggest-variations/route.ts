import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { suggestPromptVariations } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const suggestVariationsRequestShape = {
  basePrompt: z.string().trim().min(1, "Base prompt is required"),
  count: z.number().int().positive().max(20).optional(),
  isTransparent: z.boolean().optional(),
};

// POST /api/agents/suggest-variations - AI agent to suggest prompt variations
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), suggestVariationsRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    aiConfig = parsed.data.aiConfig;
    const variations = await suggestPromptVariations(
      parsed.data.basePrompt,
      parsed.data.count ?? 3,
      parsed.data.isTransparent !== undefined ? parsed.data.isTransparent : true,
      getChatModelForConfig(aiConfig),
    );

    return NextResponse.json({ variations });
  } catch (error) {
    console.error('Error in suggest-variations agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to suggest variations");
  }
}
