import { NextRequest, NextResponse } from 'next/server';
import { composerLayoutsService } from '@/lib/services';

// GET /api/composer-layouts - List all layouts
export async function GET() {
    try {
        const layouts = await composerLayoutsService.getAllLayouts();
        return NextResponse.json({ layouts });
    } catch (error) {
        console.error('Error fetching composer layouts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch layouts' },
            { status: 500 }
        );
    }
}

// POST /api/composer-layouts - Create a new layout
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, data } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Layout data is required' },
                { status: 400 }
            );
        }

        const layout = await composerLayoutsService.createLayout({ name, data });
        return NextResponse.json({ layout }, { status: 201 });
    } catch (error) {
        console.error('Error creating composer layout:', error);
        return NextResponse.json(
            { error: 'Failed to create layout' },
            { status: 500 }
        );
    }
}
