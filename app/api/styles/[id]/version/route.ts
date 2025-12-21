import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { styles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/styles/[id]/version - Create a new version of a style
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const originalStyle = await db.query.styles.findFirst({
      where: eq(styles.id, id),
    });

    if (!originalStyle) {
      return NextResponse.json(
        { error: 'Style not found' },
        { status: 404 }
      );
    }

    const [newVersion] = await db.insert(styles).values({
      name: originalStyle.name,
      version: originalStyle.version + 1,
      parentStyleId: id,
      palette: originalStyle.palette,
      renderingCues: originalStyle.renderingCues,
      description: originalStyle.description,
    }).returning();

    return NextResponse.json({ style: newVersion }, { status: 201 });
  } catch (error) {
    console.error('Error creating style version:', error);
    return NextResponse.json(
      { error: 'Failed to create style version' },
      { status: 500 }
    );
  }
}
