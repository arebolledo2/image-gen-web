import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { imageEdits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version'); // 'transparent' or null

    const edit = await db.query.imageEdits.findFirst({
      where: eq(imageEdits.id, id),
    });

    if (!edit) {
      return NextResponse.json({ error: 'Edit not found' }, { status: 404 });
    }

    // Choose file path based on version
    const filePath = version === 'transparent' && edit.transparentEditPath
      ? edit.transparentEditPath
      : edit.editedFilePath;

    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    const fileBuffer = await fs.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving image edit file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
