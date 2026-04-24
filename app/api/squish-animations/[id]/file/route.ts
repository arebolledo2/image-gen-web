import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { squishAnimations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const animation = await db.query.squishAnimations.findFirst({
      where: eq(squishAnimations.id, id),
    });

    if (!animation) {
      return NextResponse.json({ error: 'Animation not found' }, { status: 404 });
    }

    const absolutePath = path.isAbsolute(animation.spritesheetPath)
      ? animation.spritesheetPath
      : path.join(/* turbopackIgnore: true */ process.cwd(), animation.spritesheetPath);

    const fileBuffer = await fs.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving squish animation file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
