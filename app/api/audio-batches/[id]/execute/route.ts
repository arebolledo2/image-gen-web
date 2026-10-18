import { NextRequest, NextResponse } from 'next/server';
import { audioBatchesService } from '@/lib/services';
import { handleApiError } from '@/lib/api/errors';

export const runtime = 'nodejs';

// POST /api/audio-batches/[id]/execute - Execute an audio batch
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await audioBatchesService.executeAudioBatch(id);

    return NextResponse.json({
      success: true,
      message: `Audio batch queued with ${result.jobsQueued} jobs`,
      audioBatchId: id,
    });
  } catch (error) {
    return handleApiError(error, 'queue audio batch');
  }
}
