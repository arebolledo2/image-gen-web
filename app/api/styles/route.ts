import { NextRequest, NextResponse } from 'next/server';
import { stylesService } from '@/lib/services';

// GET /api/styles - List all styles with version info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

    const latestStyles = await stylesService.getLatestStyles({ favoritesOnly });
    return NextResponse.json({ styles: latestStyles });
  } catch (error) {
    console.error('Error fetching styles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    );
  }
}

// POST /api/styles - Create a new style or version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, palette, renderingCues, description, parentStyleId } = body;

    // Validate required fields
    if (!name || !palette || !renderingCues) {
      return NextResponse.json(
        { error: 'Name, palette, and renderingCues are required' },
        { status: 400 }
      );
    }

    // Create new style or version using service
    const style = parentStyleId
      ? await stylesService.createStyleVersion(parentStyleId, {
        name,
        palette,
        renderingCues,
        description,
      })
      : await stylesService.createStyle({
        name,
        palette,
        renderingCues,
        description,
      });

    return NextResponse.json({ style }, { status: 201 });
  } catch (error) {
    console.error('Error creating style:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create style' },
      { status: 500 }
    );
  }
}
