import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/batches/[id] - Get a single batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, id),
      with: {
        parentBatch: true,
        childBatches: true,
        batchPrompts: {
          orderBy: (batchPrompts, { asc }) => [asc(batchPrompts.order)],
        },
        generations: {
          with: {
            images: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ batch });
  } catch (error) {
    console.error('Error fetching batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

// DELETE /api/batches/[id] - Delete a batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(batches).where(eq(batches.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
