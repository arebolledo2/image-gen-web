import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guidanceService } from '@/lib/services';
import { handleApiError, parseBody } from '@/lib/api/errors';

const createGuidanceSchema = z.object({
  name: z.string().min(1, 'Name and description are required'),
  description: z.string().min(1, 'Name and description are required'),
});

// GET /api/guidance - List all guidance
export async function GET() {
  try {
    const guidance = await guidanceService.findAll();
    return NextResponse.json({ guidance });
  } catch (error) {
    return handleApiError(error, 'fetch guidance');
  }
}

// POST /api/guidance - Create a new guidance
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await parseBody(request, createGuidanceSchema);
    const guidance = await guidanceService.createGuidance({ name, description });
    return NextResponse.json({ guidance }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'create guidance');
  }
}
