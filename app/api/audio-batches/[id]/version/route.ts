import { NextRequest, NextResponse } from 'next/server';
import { audioBatchesService } from '@/lib/services';

// POST /api/audio-batches/[id]/version - Create a new version of an audio batch
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Create new version using service (handles all the heavy lifting)
        const newAudioBatch = await audioBatchesService.createAudioBatchVersion(id, {});

        if (!newAudioBatch) {
            return NextResponse.json(
                { error: 'Audio batch not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ audioBatch: newAudioBatch }, { status: 201 });
    } catch (error) {
        console.error('Error creating audio batch version:', error);
        return NextResponse.json(
            { error: 'Failed to create audio batch version' },
            { status: 500 }
        );
    }
}
