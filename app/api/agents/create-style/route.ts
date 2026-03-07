import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { createStyleAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const createStyleRequestShape = {
  description: z.string().trim().min(1, "Description is required"),
};

// POST /api/agents/create-style - AI agent to create a style from description
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), createStyleRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    aiConfig = parsed.data.aiConfig;
    const style = await createStyleAgent(parsed.data.description, getChatModelForConfig(aiConfig));

    return NextResponse.json({ style });
  } catch (error) {
    console.error('Error in create-style agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to create style");
  }
}
