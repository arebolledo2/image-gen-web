import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';

// PATCH /api/batches/[id]/favorite - Toggle favorite status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const batch = await batchesService.toggleFavorite(id);
        return NextResponse.json({ batch });
    } catch (error) {
        console.error('Error toggling batch favorite:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to toggle favorite' },
            { status: 500 }
        );
    }
}
