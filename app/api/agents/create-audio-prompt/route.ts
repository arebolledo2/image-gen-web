import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { createAudioPromptAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const createAudioPromptRequestShape = {
  concept: z.string().trim().min(1, "Concept is required"),
};

// POST /api/agents/create-audio-prompt - AI agent to create a detailed audio prompt from a concept
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), createAudioPromptRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    aiConfig = parsed.data.aiConfig;
    const result = await createAudioPromptAgent(parsed.data.concept, getChatModelForConfig(aiConfig));

    return NextResponse.json({ prompt: result.prompt });
  } catch (error) {
    console.error('Error in create-audio-prompt agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to create audio prompt");
  }
}
