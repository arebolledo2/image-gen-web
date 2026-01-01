import { NextRequest, NextResponse } from 'next/server';
import { audioBatchesService } from '@/lib/services';

// PATCH /api/audio-batches/[id]/settings - Update audio batch settings in place
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { provider, defaults } = body;

        // Update the existing audio batch (only works for draft batches)
        const updatedAudioBatch = await audioBatchesService.updateAudioBatch(id, {
            provider,
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
        console.error('Error updating audio batch settings:', error);
        return NextResponse.json(
            { error: 'Failed to update audio batch settings' },
            { status: 500 }
        );
    }
}
