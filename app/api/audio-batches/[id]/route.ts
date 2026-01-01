import { NextRequest, NextResponse } from 'next/server';
import { audioBatchesService } from '@/lib/services';

// GET /api/audio-batches/[id] - Get a single audio batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audioBatch = await audioBatchesService.getAudioBatchWithDetails(id);

    if (!audioBatch) {
      return NextResponse.json(
        { error: 'Audio batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioBatch });
  } catch (error) {
    console.error('Error fetching audio batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio batch' },
      { status: 500 }
    );
  }
}

// PATCH /api/audio-batches/[id] - Update an audio batch
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, defaults } = body;

    const updatedAudioBatch = await audioBatchesService.updateAudioBatch(id, {
      name,
      description,
      defaults,
    });

    if (!updatedAudioBatch) {
      return NextResponse.json(
        { error: 'Audio batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioBatch: updatedAudioBatch });
  } catch (error) {
    console.error('Error updating audio batch:', error);
    return NextResponse.json(
      { error: 'Failed to update audio batch' },
      { status: 500 }
    );
  }
}

// DELETE /api/audio-batches/[id] - Delete an audio batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = await audioBatchesService.deleteAudioBatch(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Audio batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting audio batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete audio batch' },
      { status: 500 }
    );
  }
}
