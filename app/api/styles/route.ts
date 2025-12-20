import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { styles } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

// GET /api/styles - List all styles with version info
export async function GET() {
  try {
    // Get latest version of each style
    const latestStyles = await db
      .select({
        id: styles.id,
        name: styles.name,
        version: styles.version,
        parentStyleId: styles.parentStyleId,
        palette: styles.palette,
        renderingCues: styles.renderingCues,
        description: styles.description,
        createdAt: styles.createdAt,
        updatedAt: styles.updatedAt,
      })
      .from(styles)
      .orderBy(desc(styles.createdAt));

    // Group by name and get latest version
    const styleMap = new Map();
    latestStyles.forEach((style) => {
      if (!styleMap.has(style.name) || styleMap.get(style.name).version < style.version) {
        styleMap.set(style.name, style);
      }
    });

    return NextResponse.json({
      styles: Array.from(styleMap.values())
    });
  } catch (error) {
    console.error('Error fetching styles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    );
  }
}

// POST /api/styles - Create a new style
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

    // If parentStyleId is provided, this is a new version
    let version = 1;
    if (parentStyleId) {
      const parentStyle = await db.query.styles.findFirst({
        where: eq(styles.id, parentStyleId),
      });
      if (parentStyle) {
        version = parentStyle.version + 1;
      }
    }

    const [style] = await db.insert(styles).values({
      name,
      version,
      parentStyleId: parentStyleId || null,
      palette,
      renderingCues,
      description,
    }).returning();

    return NextResponse.json({ style }, { status: 201 });
  } catch (error) {
    console.error('Error creating style:', error);
    return NextResponse.json(
      { error: 'Failed to create style' },
      { status: 500 }
    );
  }
}
