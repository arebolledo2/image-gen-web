import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/subjects/[id]/version - Create a new version of a subject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const originalSubject = await db.query.subjects.findFirst({
      where: eq(subjects.id, id),
    });

    if (!originalSubject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    const [newVersion] = await db.insert(subjects).values({
      name: originalSubject.name,
      version: originalSubject.version + 1,
      parentSubjectId: id,
      description: originalSubject.description,
    }).returning();

    return NextResponse.json({ subject: newVersion }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject version:', error);
    return NextResponse.json(
      { error: 'Failed to create subject version' },
      { status: 500 }
    );
  }
}
