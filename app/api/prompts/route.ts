import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { prompts, promptGuidance, styles, subjects, guidance } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { composeConstructedPromptAgent } from '@/lib/ai/agents';

// GET /api/prompts - List all prompts
export async function GET() {
  try {
    const allPrompts = await db.query.prompts.findMany({
      orderBy: [desc(prompts.createdAt)],
      with: {
        style: true,
        subject: true,
        promptGuidance: {
          with: {
            guidance: true
          }
        }
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
    const { name, styleId, subjectId, guidanceIds } = body;

    // Validate required fields
    if (!name || !styleId || !subjectId) {
      return NextResponse.json(
        { error: 'Name, styleId, and subjectId are required' },
        { status: 400 }
      );
    }

    // Fetch data for AI composition
    const [style] = await db.select().from(styles).where(eq(styles.id, styleId));
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    
    if (!style || !subject) {
        return NextResponse.json({ error: 'Style or Subject not found' }, { status: 404 });
    }

    const selectedGuidance = guidanceIds && guidanceIds.length > 0
        ? await db.query.guidance.findMany({
            where: (guidance, { inArray }) => inArray(guidance.id, guidanceIds)
          })
        : [];

    // Compose prompt using AI agent
    const promptText = await composeConstructedPromptAgent({
        subject: {
            name: subject.name,
            description: subject.description,
            isTransparent: subject.isTransparent
        },
        style: {
            name: style.name,
            description: style.description,
            palette: style.palette,
            renderingCues: style.renderingCues
        },
        guidance: selectedGuidance.map(g => ({
            name: g.name,
            description: g.description
        }))
    });

    // Create prompt
    const [prompt] = await db.insert(prompts).values({
      name,
      styleId,
      subjectId,
      promptText,
    }).returning();

    // Create prompt guidance relations
    if (guidanceIds && guidanceIds.length > 0) {
        const guidanceData = guidanceIds.map((gId: string) => ({
            promptId: prompt.id,
            guidanceId: gId,
        }));
        await db.insert(promptGuidance).values(guidanceData);
    }

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
