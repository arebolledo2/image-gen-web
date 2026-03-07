import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { adjustPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { batches, batchPrompts, images, generations } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
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
    const parsed = parseBodyWithAIConfig(await request.json(), adjustBatchPromptsRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { batchId, suggestion, promptStyle, referenceImageIds } = parsed.data;
    aiConfig = parsed.data.aiConfig;
    const chatModel = getChatModelForConfig(aiConfig);

    // Fetch batch and validate draft status
    const [batch] = await db
      .select({ status: batches.status })
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only adjust prompts on draft batches' },
        { status: 400 }
      );
    }

    // Fetch all prompts for this batch
    const prompts = await db
      .select({ id: batchPrompts.id, promptText: batchPrompts.promptText })
      .from(batchPrompts)
      .where(eq(batchPrompts.batchId, batchId));

    if (prompts.length === 0) {
      return NextResponse.json({ error: 'No prompts found in batch' }, { status: 400 });
    }

    // Resolve reference image prompts if provided
    let referencePrompts: string[] = [];
    if (referenceImageIds && referenceImageIds.length > 0) {
      const imageData = await db
        .select({ promptText: batchPrompts.promptText })
        .from(images)
        .innerJoin(generations, eq(images.generationId, generations.id))
        .innerJoin(batchPrompts, eq(generations.batchPromptId, batchPrompts.id))
        .where(inArray(images.id, referenceImageIds));

      referencePrompts = imageData.map((d) => d.promptText);
    }

    // Adjust all prompts in parallel
    const adjustedPrompts = await Promise.all(
      prompts.map(async (prompt) => {
        const adjustedText = await adjustPromptAgent(
          prompt.promptText,
          suggestion,
          promptStyle ?? 'terse',
          referencePrompts.length > 0 ? referencePrompts : undefined,
          chatModel,
        );
        return { id: prompt.id, promptText: adjustedText };
      })
    );

    // Save all adjusted prompts
    await Promise.all(
      adjustedPrompts.map((p) =>
        db
          .update(batchPrompts)
          .set({ promptText: p.promptText })
          .where(eq(batchPrompts.id, p.id))
      )
    );

    return NextResponse.json({ prompts: adjustedPrompts });
  } catch (error) {
    console.error('Error adjusting batch prompts:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to adjust batch prompts");
  }
}
