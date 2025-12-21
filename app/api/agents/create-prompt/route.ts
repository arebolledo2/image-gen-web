import { NextRequest, NextResponse } from 'next/server';
import { createPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { styles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/agents/create-prompt - AI agent to create a prompt template
export async function POST(request: NextRequest) {
  try {
    const { assetType, styleId, description, isTransparent } = await request.json();

    if (!assetType) {
      return NextResponse.json(
        { error: 'Asset type is required' },
        { status: 400 }
      );
    }

    // Get style details if provided
    let styleName: string | undefined;
    let styleKeywords: string[] | undefined;

    if (styleId) {
      const style = await db.query.styles.findFirst({
        where: eq(styles.id, styleId),
      });

      if (style) {
        styleName = style.name;
        // Extract keywords from rendering cues
        styleKeywords = [
          ...style.renderingCues.materials,
          ...style.renderingCues.effects,
          style.renderingCues.finish,
        ];
      }
    }

    const prompt = await createPromptAgent({
      assetType,
      styleName,
      styleKeywords,
      description,
      isTransparent: isTransparent !== undefined ? isTransparent : true,
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error in create-prompt agent:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
