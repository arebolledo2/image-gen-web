import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guidance } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/guidance/[id]/version - Create a new version of a guidance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const originalGuidance = await db.query.guidance.findFirst({
      where: eq(guidance.id, id),
    });

    if (!originalGuidance) {
      return NextResponse.json(
        { error: 'Guidance not found' },
        { status: 404 }
      );
    }

    const [newVersion] = await db.insert(guidance).values({
      name: originalGuidance.name,
      version: originalGuidance.version + 1,
      parentGuidanceId: id,
      description: originalGuidance.description,
    }).returning();

    return NextResponse.json({ guidance: newVersion }, { status: 201 });
  } catch (error) {
    console.error('Error creating guidance version:', error);
    return NextResponse.json(
      { error: 'Failed to create guidance version' },
      { status: 500 }
    );
  }
}
