import { NextRequest, NextResponse } from 'next/server';
import { createAudioPromptAgent } from '@/lib/ai/agents';

// POST /api/agents/create-audio-prompt - AI agent to create a detailed audio prompt from a concept
export async function POST(request: NextRequest) {
  try {
    const { concept } = await request.json();

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept is required' },
        { status: 400 }
      );
    }

    const result = await createAudioPromptAgent(concept);

    return NextResponse.json({ prompt: result.prompt });
  } catch (error) {
    console.error('Error in create-audio-prompt agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create audio prompt' },
      { status: 500 }
    );
  }
}
