import { NextRequest, NextResponse } from 'next/server';
import { audioFilesService } from '@/lib/services';

// GET /api/audio - List audio files with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const searchQuery = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    let audioFiles;

    if (batchId) {
      // Get audio files for a specific batch
      audioFiles = await audioFilesService.getAudioFilesByBatch(batchId, {
        favoritesOnly,
        limit,
      });
    } else {
      // Get all audio files with optional filters
      audioFiles = await audioFilesService.getAllAudioFiles({
        favoritesOnly,
        searchQuery,
        limit,
        offset,
      });
    }

    return NextResponse.json({ audioFiles });
  } catch (error) {
    console.error('Error fetching audio files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audio files' },
      { status: 500 }
    );
  }
}
