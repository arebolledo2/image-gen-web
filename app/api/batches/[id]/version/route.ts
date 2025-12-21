import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches, batchPrompts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/batches/[id]/version - Create a new version of a batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch original batch with all batch prompts
    const originalBatch = await db.query.batches.findFirst({
      where: eq(batches.id, id),
      with: {
        batchPrompts: {
          orderBy: (batchPrompts, { asc }) => [asc(batchPrompts.order)],
        },
      },
    });

    if (!originalBatch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Create new batch version (always status='draft')
    const [newBatch] = await db.insert(batches).values({
      name: originalBatch.name,
      version: originalBatch.version + 1,
      parentBatchId: id,
      description: originalBatch.description,
      status: 'draft',  // Always start as draft
      provider: originalBatch.provider,
      defaults: originalBatch.defaults,
    }).returning();

    // Copy all batch prompts (maintain prompt references)
    if (originalBatch.batchPrompts.length > 0) {
      const newBatchPromptsData = originalBatch.batchPrompts.map((bp) => ({
        batchId: newBatch.id,
        promptId: bp.promptId,      // Keep same prompt reference
        promptText: bp.promptText,
        overrides: bp.overrides,
        order: bp.order,
      }));

      await db.insert(batchPrompts).values(newBatchPromptsData);
    }

    // Fetch complete new batch with relations
    const completeBatch = await db.query.batches.findFirst({
      where: eq(batches.id, newBatch.id),
      with: {
        batchPrompts: true,
      },
    });

    return NextResponse.json({ batch: completeBatch }, { status: 201 });
  } catch (error) {
    console.error('Error creating batch version:', error);
    return NextResponse.json(
      { error: 'Failed to create batch version' },
      { status: 500 }
    );
  }
}
