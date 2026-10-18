import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guidanceService } from '@/lib/services';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

const updateGuidanceSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/guidance/[id] - Get a single guidance with its lineage
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const guidance = await guidanceService.getGuidanceWithLineage(id);
    if (!guidance) throw notFound('Guidance');

    return NextResponse.json({ guidance });
  } catch (error) {
    return handleApiError(error, 'fetch guidance');
  }
}

// PATCH /api/guidance/[id] - Update a guidance
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const data = await parseBody(request, updateGuidanceSchema);
    const guidance = await guidanceService.updateGuidance(id, data);
    if (!guidance) throw notFound('Guidance');

    return NextResponse.json({ guidance });
  } catch (error) {
    return handleApiError(error, 'update guidance');
  }
}

// DELETE /api/guidance/[id] - Delete a guidance
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await guidanceService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete guidance');
  }
}
