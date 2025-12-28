import { NextRequest, NextResponse } from 'next/server';
import { audioFilesService } from '@/lib/services';

// GET /api/audio/[id] - Get a single audio file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audioFile = await audioFilesService.getAudioFileWithDetails(id);

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioFile });
  } catch (error) {
    console.error('Error fetching audio file:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    );
  }
}

// PATCH /api/audio/[id] - Update an audio file (favorites)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isFavorite } = body;

    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: 'isFavorite must be a boolean' },
        { status: 400 }
      );
    }

    const updatedAudioFile = await audioFilesService.toggleFavorite(id, isFavorite);

    if (!updatedAudioFile) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ audioFile: updatedAudioFile });
  } catch (error) {
    console.error('Error updating audio file:', error);
    return NextResponse.json(
      { error: 'Failed to update audio file' },
      { status: 500 }
    );
  }
}
