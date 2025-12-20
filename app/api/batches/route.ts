import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches, batchPrompts } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/batches - List all batches
export async function GET() {
  try {
    const allBatches = await db.query.batches.findMany({
      orderBy: [desc(batches.createdAt)],
      with: {
        batchPrompts: true,
      },
    });

    return NextResponse.json({ batches: allBatches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

// POST /api/batches - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, defaults, prompts } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json(
        { error: 'At least one prompt is required' },
        { status: 400 }
      );
    }

    // Create batch
    const [batch] = await db.insert(batches).values({
      name,
      description,
      status: 'draft',
      defaults: defaults || {},
    }).returning();

    // Create batch prompts
    const batchPromptsData = prompts.map((prompt: any, index: number) => ({
      batchId: batch.id,
      promptId: prompt.promptId || null,
      promptText: prompt.promptText,
      overrides: prompt.overrides || {},
      order: index,
    }));

    await db.insert(batchPrompts).values(batchPromptsData);

    // Fetch complete batch with prompts
    const completeBatch = await db.query.batches.findFirst({
      where: (batches, { eq }) => eq(batches.id, batch.id),
      with: {
        batchPrompts: true,
      },
    });

    return NextResponse.json({ batch: completeBatch }, { status: 201 });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}
