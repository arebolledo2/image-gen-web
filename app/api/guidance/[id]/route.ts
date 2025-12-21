import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guidance } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/guidance/[id] - Get a single guidance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const guidanceItem = await db.query.guidance.findFirst({
      where: eq(guidance.id, id),
      with: {
        parentGuidance: true,
        childGuidances: true,
      },
    });

    if (!guidanceItem) {
      return NextResponse.json(
        { error: 'Guidance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ guidance: guidanceItem });
  } catch (error) {
    console.error('Error fetching guidance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guidance' },
      { status: 500 }
    );
  }
}

// PATCH /api/guidance/[id] - Update a guidance
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const [updatedGuidance] = await db
      .update(guidance)
      .set(updateData)
      .where(eq(guidance.id, id))
      .returning();

    if (!updatedGuidance) {
      return NextResponse.json(
        { error: 'Guidance not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ guidance: updatedGuidance });
  } catch (error) {
    console.error('Error updating guidance:', error);
    return NextResponse.json(
      { error: 'Failed to update guidance' },
      { status: 500 }
    );
  }
}

// DELETE /api/guidance/[id] - Delete a guidance
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.delete(guidance).where(eq(guidance.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting guidance:', error);
    return NextResponse.json(
      { error: 'Failed to delete guidance' },
      { status: 500 }
    );
  }
}
