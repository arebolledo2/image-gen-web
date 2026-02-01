import { NextRequest, NextResponse } from 'next/server';
import { subjectsService } from '@/lib/services';

// PATCH /api/subjects/[id]/favorite - Toggle favorite status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const subject = await subjectsService.toggleFavorite(id);
        return NextResponse.json({ subject });
    } catch (error) {
        console.error('Error toggling subject favorite:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to toggle favorite' },
            { status: 500 }
        );
    }
}
