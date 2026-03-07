import { NextResponse } from 'next/server';
import { z } from "zod";
import { createBatchMetadataAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const createBatchMetadataRequestShape = {
  promptText: z.string().trim().min(1, "Prompt text is required"),
};

export async function POST(req: Request) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await req.json(), createBatchMetadataRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    aiConfig = parsed.data.aiConfig;
    const metadata = await createBatchMetadataAgent(parsed.data.promptText, getChatModelForConfig(aiConfig));
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Batch metadata generation error:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to generate batch metadata");
  }
}
