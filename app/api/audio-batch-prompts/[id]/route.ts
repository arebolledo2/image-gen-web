import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { audioBatchPrompts, audioBatches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/audio-batch-prompts/[id] - Update an audio batch prompt
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { promptText } = await request.json();

        if (!promptText) {
            return NextResponse.json(
                { error: 'Prompt text is required' },
                { status: 400 }
            );
        }

        // Check if the prompt exists and its batch is in draft status
        const existingPrompt = await db.query.audioBatchPrompts.findFirst({
            where: eq(audioBatchPrompts.id, id),
            with: {
                audioBatch: true,
            },
        });

        if (!existingPrompt) {
            return NextResponse.json(
                { error: 'Audio batch prompt not found' },
                { status: 404 }
            );
        }

        if (existingPrompt.audioBatch.status !== 'draft') {
            return NextResponse.json(
                { error: 'Cannot edit prompts for non-draft audio batches' },
                { status: 400 }
            );
        }

        await db.update(audioBatchPrompts)
            .set({ promptText })
            .where(eq(audioBatchPrompts.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating audio batch prompt:', error);
        return NextResponse.json(
            { error: 'Failed to update audio batch prompt' },
            { status: 500 }
        );
    }
}
