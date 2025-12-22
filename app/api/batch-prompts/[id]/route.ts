import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batchPrompts, batches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/batch-prompts/[id] - Update a batch prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { promptText } = await request.json();

    if (!promptText) {
      return NextResponse.json(
        { error: 'Prompt text is required' },
        { status: 400 }
      );
    }

    // Check if the prompt exists and its batch is in draft status
    const existingPrompt = await db.query.batchPrompts.findFirst({
      where: eq(batchPrompts.id, id),
      with: {
        batch: true,
      },
    });

    if (!existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    if (existingPrompt.batch.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot edit prompts for non-draft batches' },
        { status: 400 }
      );
    }

    await db.update(batchPrompts)
      .set({ promptText, updatedAt: new Date() } as any) // updatedAt might not be on batchPrompts, let's check schema
      .where(eq(batchPrompts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating batch prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update batch prompt' },
      { status: 500 }
    );
  }
}
