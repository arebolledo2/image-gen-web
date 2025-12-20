import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prompts } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/prompts - List all prompts
export async function GET() {
  try {
    const allPrompts = await db.query.prompts.findMany({
      orderBy: [desc(prompts.createdAt)],
      with: {
        style: true,
      },
    });

    return NextResponse.json({ prompts: allPrompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, template, variables, styleId, tags } = body;

    // Validate required fields
    if (!name || !template) {
      return NextResponse.json(
        { error: 'Name and template are required' },
        { status: 400 }
      );
    }

    const [prompt] = await db.insert(prompts).values({
      name,
      template,
      variables: variables || {},
      styleId: styleId || null,
      tags: tags || [],
    }).returning();

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
