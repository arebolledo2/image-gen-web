import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { createPromptAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseAgentBody } from "@/lib/ai/request-config";
import { stylesService } from '@/lib/services';
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
    const { assetType, styleId, description, isTransparent, aiConfig: resolvedConfig } =
      await parseAgentBody(request, createPromptRequestShape);
    aiConfig = resolvedConfig;

    // An unknown style is ignored rather than rejected: the prompt is still useful without it
    const style = styleId ? await stylesService.findById(styleId) : undefined;

    const prompt = await createPromptAgent({
      assetType,
      styleName: style?.name,
      styleKeywords: style
        ? [...style.renderingCues.materials, ...style.renderingCues.effects, style.renderingCues.finish]
        : undefined,
      description,
      isTransparent: isTransparent ?? true,
    }, getChatModelForConfig(aiConfig));

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error in create-prompt agent:', error);
    return buildAgentErrorResponse(error, aiConfig.chat, "Failed to create prompt");
  }
}
