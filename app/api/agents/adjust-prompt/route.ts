import { NextRequest, NextResponse } from 'next/server';
import { adjustPromptAgent } from '@/lib/ai/agents';

// POST /api/agents/adjust-prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { basePrompt, suggestion, promptStyle } = body;

    if (!basePrompt || !suggestion) {
      return NextResponse.json(
        { error: 'basePrompt and suggestion are required' },
        { status: 400 }
      );
    }

    const adjustedPrompt = await adjustPromptAgent(basePrompt, suggestion, promptStyle);

    return NextResponse.json({ promptText: adjustedPrompt });
  } catch (error) {
    console.error('Error adjusting prompt:', error);
    return NextResponse.json(
      { error: 'Failed to adjust prompt' },
      { status: 500 }
    );
  }
}
