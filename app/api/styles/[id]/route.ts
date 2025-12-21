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

// PATCH /api/styles/[id] - Update a style
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, palette, renderingCues } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (palette !== undefined) updateData.palette = palette;
    if (renderingCues !== undefined) updateData.renderingCues = renderingCues;

    const [updatedStyle] = await db
      .update(styles)
      .set(updateData)
      .where(eq(styles.id, id))
      .returning();

    if (!updatedStyle) {
      return NextResponse.json(
        { error: 'Style not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ style: updatedStyle });
  } catch (error) {
    console.error('Error updating style:', error);
    return NextResponse.json(
      { error: 'Failed to update style' },
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
