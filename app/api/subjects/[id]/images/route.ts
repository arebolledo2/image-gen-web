import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';

/**
 * GET /api/subjects/[id]/images
 * Fetches all images generated for a specific subject.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const images = await imagesService.getImagesBySubjectId(id);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Error fetching images for subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images for subject' },
      { status: 500 }
    );
  }
}
