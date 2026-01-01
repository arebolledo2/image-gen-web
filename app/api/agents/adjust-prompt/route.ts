import { NextRequest, NextResponse } from 'next/server';
import { adjustPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { images, generations, batchPrompts } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// POST /api/agents/adjust-prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { basePrompt, suggestion, promptStyle, referenceImageIds } = body;

    if (!basePrompt || !suggestion) {
      return NextResponse.json(
        { error: 'basePrompt and suggestion are required' },
        { status: 400 }
      );
    }

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
      promptStyle,
      referencePrompts.length > 0 ? referencePrompts : undefined
    );

    return NextResponse.json({ promptText: adjustedPrompt });
  } catch (error) {
    console.error('Error adjusting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to adjust prompt' },
      { status: 500 }
    );
  }
}
