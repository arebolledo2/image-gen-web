import { NextRequest, NextResponse } from 'next/server';
import { createStyleAgent } from '@/lib/ai/agents';

// POST /api/agents/create-style - AI agent to create a style from description
export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    const style = await createStyleAgent(description);

    return NextResponse.json({ style });
  } catch (error) {
    console.error('Error in create-style agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create style' },
      { status: 500 }
    );
  }
}
