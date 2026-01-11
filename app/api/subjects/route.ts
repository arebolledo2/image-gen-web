import { NextRequest, NextResponse } from 'next/server';
import { subjectsService } from '@/lib/services';

// GET /api/subjects - List all subjects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;

    const allSubjects = await subjectsService.getLatestSubjects(categoryId);

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
    const { name, description, isTransparent, categoryId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const subject = await subjectsService.createSubject({
      name,
      description,
      isTransparent: isTransparent !== undefined ? isTransparent : true,
      categoryId,
    });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
