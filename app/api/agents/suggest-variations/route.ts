import { NextRequest, NextResponse } from 'next/server';
import { suggestPromptVariations } from '@/lib/ai/agents';

// POST /api/agents/suggest-variations - AI agent to suggest prompt variations
export async function POST(request: NextRequest) {
  try {
    const { basePrompt, count = 3 } = await request.json();

    if (!basePrompt) {
      return NextResponse.json(
        { error: 'Base prompt is required' },
        { status: 400 }
      );
    }

    const variations = await suggestPromptVariations(basePrompt, count);

    return NextResponse.json({ variations });
  } catch (error) {
    console.error('Error in suggest-variations agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to suggest variations' },
      { status: 500 }
    );
  }
}
