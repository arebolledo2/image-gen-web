import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { db } from '@/lib/db';
import { styles, subjects, prompts, promptGuidance } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { composeConstructedPromptAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const composePromptRequestShape = {
  styleId: z.string().optional(),
  subjectId: z.string().trim().min(1, "subjectId is required"),
  guidanceIds: z.array(z.string()).optional(),
  promptStyle: z.enum(['terse', 'verbose']).optional(),
};

// POST /api/agents/compose-prompt
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), composePromptRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { styleId, subjectId, guidanceIds, promptStyle } = parsed.data;
    aiConfig = parsed.data.aiConfig;

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
    }, getChatModelForConfig(aiConfig));

    // Create a prompt record in the database to enable category filtering
    // This links the composed prompt to the subject (and its category)
    const [createdPrompt] = await db.insert(prompts).values({
      name: `${subject.name} prompt`,
      styleId: styleId || null!,  // May be null if style was omitted
      subjectId: subjectId,
      promptText: promptText,
    }).returning();

    // Link guidance to the prompt if any was selected
    if (selectedGuidance.length > 0) {
      await db.insert(promptGuidance).values(
        selectedGuidance.map(g => ({
          promptId: createdPrompt.id,
          guidanceId: g.id,
        }))
      );
    }

    return NextResponse.json({
      promptText,
      promptId: createdPrompt.id
    });
  } catch (error) {
    console.error('Error composing prompt:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to compose prompt");
  }
}
