import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';

// PATCH /api/batches/[id]/settings - Update batch settings in place
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { provider, defaults } = body;

        // Update the existing batch (only works for draft batches)
        const updatedBatch = await batchesService.updateBatch(id, {
            provider,
            defaults,
        });

        if (!updatedBatch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ batch: updatedBatch });
    } catch (error) {
        console.error('Error updating batch settings:', error);
        return NextResponse.json(
            { error: 'Failed to update batch settings' },
            { status: 500 }
        );
    }
}
