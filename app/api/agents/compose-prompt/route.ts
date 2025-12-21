import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { styles, subjects, guidance } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { composeConstructedPromptAgent } from '@/lib/ai/agents';

// POST /api/agents/compose-prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { styleId, subjectId, guidanceIds } = body;

    if (!styleId || !subjectId) {
      return NextResponse.json(
        { error: 'styleId and subjectId are required' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ promptText });
  } catch (error) {
    console.error('Error composing prompt:', error);
    return NextResponse.json(
      { error: 'Failed to compose prompt' },
      { status: 500 }
    );
  }
}
