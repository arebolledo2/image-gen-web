import { NextRequest, NextResponse } from 'next/server';
import { imagesService } from '@/lib/services';
import { suggestAnimation } from '@/lib/ai/ai-animation';
import { readImage } from '@/lib/storage/local-storage';
import { handleApiError, notFound } from '@/lib/api/errors';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await imagesService.getImageWithPromptContext(id);
    if (!image) throw notFound('Image');

    const prompt = image.generation?.batchPrompt?.prompt;
    const suggestion = await suggestAnimation({
      imageBuffer: await readImage(image.transparentFilePath || image.filePath),
      mimeType: image.mediaType || 'image/png',
      styleName: prompt?.style?.name || 'unknown style',
      subjectName: prompt?.subject?.name || 'sprite',
    });

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    return handleApiError(error, 'suggest animation');
  }
}
