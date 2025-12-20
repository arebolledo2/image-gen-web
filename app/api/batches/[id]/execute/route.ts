import { NextRequest, NextResponse } from 'next/server';
import { executeBatch } from '@/lib/ai/image-generation';

// POST /api/batches/[id]/execute - Execute a batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Execute batch in background (for now, synchronously)
    // In production, you'd want to use a job queue
    await executeBatch(id);

    return NextResponse.json({ success: true, message: 'Batch execution started' });
  } catch (error) {
    console.error('Error executing batch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute batch' },
      { status: 500 }
    );
  }
}
