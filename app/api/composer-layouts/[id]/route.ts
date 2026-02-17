import { NextRequest, NextResponse } from 'next/server';
import { composerLayoutsService } from '@/lib/services';

interface Params {
    params: Promise<{
        id: string;
    }>;
}

// GET /api/composer-layouts/[id] - Get a single layout
export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const layout = await composerLayoutsService.findById(id);
        if (!layout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }
        return NextResponse.json({ layout });
    } catch (error) {
        console.error('Error fetching composer layout:', error);
        return NextResponse.json(
            { error: 'Failed to fetch layout' },
            { status: 500 }
        );
    }
}

// PATCH /api/composer-layouts/[id] - Update layout
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        const body = await request.json();
        const layout = await composerLayoutsService.update(id, body);
        if (!layout) {
            return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
        }
        return NextResponse.json({ layout });
    } catch (error) {
        console.error('Error updating composer layout:', error);
        return NextResponse.json(
            { error: 'Failed to update layout' },
            { status: 500 }
        );
    }
}

// DELETE /api/composer-layouts/[id] - Delete layout
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const { id } = await params;
        await composerLayoutsService.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting composer layout:', error);
        return NextResponse.json(
            { error: 'Failed to delete layout' },
            { status: 500 }
        );
    }
}
