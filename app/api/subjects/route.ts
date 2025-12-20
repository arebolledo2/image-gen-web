import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/subjects - List all subjects
export async function GET() {
  try {
    const allSubjects = await db.query.subjects.findMany({
      orderBy: [desc(subjects.createdAt)],
    });

    return NextResponse.json({ subjects: allSubjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create a new subject
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const [subject] = await db.insert(subjects).values({
      name,
      description,
    }).returning();

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
