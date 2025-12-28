import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { audioBatches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { queueAudioBatchExecution } from '@/lib/queue/audio-batch-queue';

export const runtime = 'nodejs';

// POST /api/audio-batches/[id]/execute - Execute an audio batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get audio batch with prompts
    const audioBatch = await db.query.audioBatches.findFirst({
      where: eq(audioBatches.id, id),
      with: {
        audioBatchPrompts: {
          orderBy: (audioBatchPrompts, { asc }) => [asc(audioBatchPrompts.order)],
        },
      },
    });

    if (!audioBatch) {
      return NextResponse.json({ error: 'Audio batch not found' }, { status: 404 });
    }

    // Update status to queued
    await db.update(audioBatches)
      .set({ status: 'queued' })
      .where(eq(audioBatches.id, id));

    // Queue jobs
    const result = await queueAudioBatchExecution(audioBatch);

    return NextResponse.json({
      success: true,
      message: `Audio batch queued with ${result.jobsQueued} jobs`,
      audioBatchId: id,
    });

  } catch (error) {
    console.error('Error queueing audio batch:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to queue audio batch',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
