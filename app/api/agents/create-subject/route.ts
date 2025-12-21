import { NextRequest, NextResponse } from 'next/server';
import { createSubjectAgent } from '@/lib/ai/agents';

// POST /api/agents/create-subject - AI agent to create a subject from a concept
export async function POST(request: NextRequest) {
  try {
    const { concept } = await request.json();

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept is required' },
        { status: 400 }
      );
    }

    const subject = await createSubjectAgent(concept);

    return NextResponse.json({ subject });
  } catch (error) {
    console.error('Error in create-subject agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subject' },
      { status: 500 }
    );
  }
}
