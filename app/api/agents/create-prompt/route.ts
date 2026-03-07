import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { createPromptAgent } from '@/lib/ai/agents';
import { db } from '@/lib/db';
import { styles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const createPromptRequestShape = {
  assetType: z.string().trim().min(1, "Asset type is required"),
  styleId: z.string().optional(),
  description: z.string().optional(),
  isTransparent: z.boolean().optional(),
};

// POST /api/agents/create-prompt - AI agent to create a prompt template
export async function POST(request: NextRequest) {
  let aiConfig = resolveAIRequestConfig();

  try {
    const parsed = parseBodyWithAIConfig(await request.json(), createPromptRequestShape);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { assetType, styleId, description, isTransparent } = parsed.data;
    aiConfig = parsed.data.aiConfig;

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
    }, getChatModelForConfig(aiConfig));

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error in create-prompt agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to create prompt");
  }
}
