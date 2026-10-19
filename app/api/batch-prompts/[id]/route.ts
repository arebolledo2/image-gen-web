import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { batchesService } from '@/lib/services';
import { handleApiError, parseBody } from '@/lib/api/errors';

const updatePromptSchema = z.object({
  promptText: z.string({ error: 'Prompt text is required' }).trim().min(1, 'Prompt text is required'),
});

// PATCH /api/batch-prompts/[id] - Update a batch prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { promptText } = await parseBody(request, updatePromptSchema);
    await batchesService.updateDraftPromptText(id, promptText);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'update batch prompt');
  }
}
