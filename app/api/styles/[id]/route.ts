import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stylesService } from '@/lib/services';
import { handleApiError, notFound, parseBody } from '@/lib/api/errors';

type RouteContext = { params: Promise<{ id: string }> };

const updateStyleSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  palette: z
    .object({
      primary: z.array(z.string()),
      accent: z.array(z.string()),
      background: z.string(),
    })
    .optional(),
  renderingCues: z
    .object({
      materials: z.array(z.string()),
      effects: z.array(z.string()),
      finish: z.string(),
    })
    .optional(),
});

// GET /api/styles/[id] - Get a single style with its lineage
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const style = await stylesService.getStyleWithLineage(id);
    if (!style) throw notFound('Style');

    return NextResponse.json({ style });
  } catch (error) {
    return handleApiError(error, 'fetch style');
  }
}

// PATCH /api/styles/[id] - Update a style
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const data = await parseBody(request, updateStyleSchema);
    const style = await stylesService.updateStyle(id, data);
    if (!style) throw notFound('Style');

    return NextResponse.json({ style });
  } catch (error) {
    return handleApiError(error, 'update style');
  }
}

// DELETE /api/styles/[id] - Delete a single style version
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await stylesService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'delete style');
  }
}
