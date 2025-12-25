import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { styles, subjects, guidance } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { composeConstructedPromptAgent } from '@/lib/ai/agents';

// POST /api/agents/compose-prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId, subjectId, guidanceIds, promptStyle } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: 'subjectId is required' },
        { status: 400 }
      );
    }

    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Fetch style only if styleId is provided
    let style = null;
    if (styleId) {
      [style] = await db.select().from(styles).where(eq(styles.id, styleId));
      if (!style) {
        return NextResponse.json({ error: 'Style not found' }, { status: 404 });
      }
    }

    const selectedGuidance = guidanceIds && guidanceIds.length > 0
      ? await db.query.guidance.findMany({
        where: (guidance, { inArray }) => inArray(guidance.id, guidanceIds)
      })
      : [];

    const promptText = await composeConstructedPromptAgent({
      subject: {
        name: subject.name,
        description: subject.description,
        isTransparent: subject.isTransparent
      },
      style: style ? {
        name: style.name,
        description: style.description,
        palette: style.palette,
        renderingCues: style.renderingCues
      } : undefined,
      guidance: selectedGuidance.map(g => ({
        name: g.name,
        description: g.description
      })),
      promptStyle
    });

    return NextResponse.json({ promptText });
  } catch (error) {
    console.error('Error composing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to compose prompt' },
      { status: 500 }
    );
  }
}
