import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { adjustPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { images, generations, batchPrompts } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
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
    const parsed = parseBodyWithAIConfig(await request.json(), adjustPromptRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { basePrompt, suggestion, promptStyle, referenceImageIds } = parsed.data;
    aiConfig = parsed.data.aiConfig;

    // If reference images are provided, fetch their prompts
    let referencePrompts: string[] = [];
    if (referenceImageIds && referenceImageIds.length > 0) {
      const imageData = await db
        .select({
          promptText: batchPrompts.promptText,
        })
        .from(images)
        .innerJoin(generations, eq(images.generationId, generations.id))
        .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
        .where(inArray(images.id, referenceImageIds));

      referencePrompts = imageData.map((d) => d.promptText);
    }

    const adjustedPrompt = await adjustPromptAgent(
      basePrompt,
      suggestion,
      promptStyle ?? 'terse',
      referencePrompts.length > 0 ? referencePrompts : undefined,
      getChatModelForConfig(aiConfig),
    );

    return NextResponse.json({ promptText: adjustedPrompt });
  } catch (error) {
    console.error('Error adjusting prompt:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to adjust prompt");
  }
}
