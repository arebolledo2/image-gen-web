import { NextRequest, NextResponse } from 'next/server';
import { editStyleAgent } from '@/lib/ai/agents';

// POST /api/agents/edit-style
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { currentStyle, userRequest } = body;

        if (!currentStyle || !userRequest) {
            return NextResponse.json(
                { error: 'currentStyle and userRequest are required' },
                { status: 400 }
            );
        }

        // Validate currentStyle has required structure
        if (!currentStyle.name || !currentStyle.palette || !currentStyle.renderingCues) {
            return NextResponse.json(
                { error: 'currentStyle must have name, palette, and renderingCues' },
                { status: 400 }
            );
        }

        const modifiedStyle = await editStyleAgent({ currentStyle, userRequest });

        return NextResponse.json({ style: modifiedStyle });
    } catch (error) {
        console.error('Error editing style:', error);
        return NextResponse.json(
            { error: 'Failed to edit style' },
            { status: 500 }
        );
    }
}
