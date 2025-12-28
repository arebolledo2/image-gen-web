import { NextRequest, NextResponse } from 'next/server';
import { audioFilesService } from '@/lib/services';
import * as fs from 'fs';
import * as path from 'path';

// GET /api/audio/[id]/file - Serve audio file for playback/download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get audio file metadata
    const audioFile = await audioFilesService.getAudioFileWithDetails(id);

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // Build absolute file path
    const publicDir = path.join(process.cwd(), 'public');
    const absolutePath = path.join(publicDir, audioFile.filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: 'Audio file not found on disk' },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = fs.readFileSync(absolutePath);

    // Check for download parameter
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get('download') === 'true';

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', audioFile.mediaType);
    headers.set('Content-Length', fileBuffer.length.toString());

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${audioFile.fileName}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${audioFile.fileName}"`);
    }

    // Return the file
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      { error: 'Failed to serve audio file' },
      { status: 500 }
    );
  }
}
