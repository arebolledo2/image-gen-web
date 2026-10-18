import { NextRequest, NextResponse } from 'next/server';
import { promptsService } from '@/lib/services';
import { handleApiError, notFound } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/prompts/[id] - Get a prompt with its style, subject and guidance
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const prompt = await promptsService.getPromptWithRelations(id);
    if (!prompt) throw notFound('Prompt');

    return NextResponse.json({ prompt });
  } catch (error) {
    return handleApiError(error, 'fetch prompt');
  }
}

// DELETE /api/prompts/[id] - Delete a prompt and its guidance associations
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await promptsService.deletePrompt(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete prompt');
  }
}
