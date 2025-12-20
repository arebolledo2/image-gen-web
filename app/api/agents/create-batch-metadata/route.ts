import { NextResponse } from 'next/server';
import { createBatchMetadataAgent } from '@/lib/ai/agents';

export async function POST(req: Request) {
  try {
    const { promptText } = await req.json();

    if (!promptText) {
      return NextResponse.json(
        { error: 'Prompt text is required' },
        { status: 400 }
      );
    }

    const metadata = await createBatchMetadataAgent(promptText);
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Batch metadata generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate batch metadata' },
      { status: 500 }
    );
  }
}
