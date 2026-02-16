import { NextRequest, NextResponse } from 'next/server';
import { adjustPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { batches, batchPrompts, images, generations } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// POST /api/agents/adjust-batch-prompts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, suggestion, promptStyle, referenceImageIds } = body;

    if (!batchId || !suggestion) {
      return NextResponse.json(
        { error: 'batchId and suggestion are required' },
        { status: 400 }
      );
    }

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
          promptStyle,
          referencePrompts.length > 0 ? referencePrompts : undefined
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
    return NextResponse.json(
      { error: 'Failed to adjust batch prompts' },
      { status: 500 }
    );
  }
}
