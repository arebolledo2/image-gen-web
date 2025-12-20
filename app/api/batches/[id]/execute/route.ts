import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { queueBatchExecution } from '@/lib/queue/batch-queue';

export const runtime = 'nodejs';

// POST /api/batches/[id]/execute - Execute a batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get batch with prompts
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, id),
      with: {
        batchPrompts: {
          orderBy: (batchPrompts, { asc }) => [asc(batchPrompts.order)],
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Update status to queued
    await db.update(batches)
      .set({ status: 'queued' })
      .where(eq(batches.id, id));

    // Queue jobs
    const result = await queueBatchExecution(batch);

    return NextResponse.json({
      success: true,
      message: `Batch queued with ${result.jobsQueued} jobs`,
      batchId: id,
    });

  } catch (error) {
    console.error('Error queueing batch:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to queue batch',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
