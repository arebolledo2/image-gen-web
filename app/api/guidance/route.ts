import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { guidance } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/guidance - List all guidance
export async function GET() {
  try {
    const allGuidance = await db.query.guidance.findMany({
      orderBy: [desc(guidance.createdAt)],
    });

    return NextResponse.json({ guidance: allGuidance });
  } catch (error) {
    console.error('Error fetching guidance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guidance' },
      { status: 500 }
    );
  }
}

// POST /api/guidance - Create a new guidance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    const [newGuidance] = await db.insert(guidance).values({
      name,
      description,
    }).returning();

    return NextResponse.json({ guidance: newGuidance }, { status: 201 });
  } catch (error) {
    console.error('Error creating guidance:', error);
    return NextResponse.json(
      { error: 'Failed to create guidance' },
      { status: 500 }
    );
  }
}
