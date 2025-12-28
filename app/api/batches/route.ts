import { NextRequest, NextResponse } from 'next/server';
import { batchesService } from '@/lib/services';

// GET /api/batches - List all batches
export async function GET() {
  try {
    const allBatches = await batchesService.getAllBatchesWithDetails();
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
    const { name, description, provider, defaults, prompts } = body;

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

    // Create batch using service (with transaction support!)
    const batch = await batchesService.createBatch({
      name,
      description,
      provider,
      defaults,
      prompts,
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create batch' },
      { status: 500 }
    );
  }
}
