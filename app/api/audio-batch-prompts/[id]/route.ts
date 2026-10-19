import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { audioBatchesService } from '@/lib/services';
import { handleApiError, parseBody } from '@/lib/api/errors';

const updatePromptSchema = z.object({
  promptText: z.string({ error: 'Prompt text is required' }).trim().min(1, 'Prompt text is required'),
});

// PATCH /api/audio-batch-prompts/[id] - Update an audio batch prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { promptText } = await parseBody(request, updatePromptSchema);
    await audioBatchesService.updateDraftPromptText(id, promptText);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'update audio batch prompt');
  }
}
