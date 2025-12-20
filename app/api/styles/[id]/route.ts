import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { styles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/styles/[id] - Get a single style
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const style = await db.query.styles.findFirst({
      where: eq(styles.id, id),
      with: {
        parentStyle: true,
        childStyles: true,
      },
    });

    if (!style) {
      return NextResponse.json(
        { error: 'Style not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ style });
  } catch (error) {
    console.error('Error fetching style:', error);
    return NextResponse.json(
      { error: 'Failed to fetch style' },
      { status: 500 }
    );
  }
}

// DELETE /api/styles/[id] - Delete a style
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(styles).where(eq(styles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting style:', error);
    return NextResponse.json(
      { error: 'Failed to delete style' },
      { status: 500 }
    );
  }
}
