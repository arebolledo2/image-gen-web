import { NextRequest, NextResponse } from 'next/server';
import { audioBatchesService } from '@/lib/services';

// GET /api/audio-batches - List all audio batches
export async function GET() {
  try {
    const allAudioBatches = await audioBatchesService.getAllAudioBatchesWithDetails();
    return NextResponse.json({ audioBatches: allAudioBatches });
  } catch (error) {
    console.error('Error fetching audio batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio batches' },
      { status: 500 }
    );
  }
}

// POST /api/audio-batches - Create a new audio batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, provider, defaults, prompts } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json(
        { error: 'At least one prompt is required' },
        { status: 400 }
      );
    }

    // Create audio batch using service (with transaction support!)
    const audioBatch = await audioBatchesService.createAudioBatch({
      name,
      description,
      provider,
      defaults,
      prompts,
    });

    return NextResponse.json({ audioBatch }, { status: 201 });
  } catch (error) {
    console.error('Error creating audio batch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create audio batch' },
      { status: 500 }
    );
  }
}
