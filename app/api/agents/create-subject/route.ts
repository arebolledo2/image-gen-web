import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { createSubjectAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const createSubjectRequestShape = {
  concept: z.string().trim().min(1, "Concept is required"),
};

// POST /api/agents/create-subject - AI agent to create a subject from a concept
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), createSubjectRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    aiConfig = parsed.data.aiConfig;
    const subject = await createSubjectAgent(parsed.data.concept, getChatModelForConfig(aiConfig));

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('Error in create-subject agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to create subject");
  }
}
