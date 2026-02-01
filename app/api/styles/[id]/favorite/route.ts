import { NextRequest, NextResponse } from 'next/server';
import { stylesService } from '@/lib/services';

// PATCH /api/styles/[id]/favorite - Toggle favorite status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const style = await stylesService.toggleFavorite(id);
        return NextResponse.json({ style });
    } catch (error) {
        console.error('Error toggling style favorite:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to toggle favorite' },
            { status: 500 }
        );
    }
}
