import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { editStyleAgent } from '@/lib/ai/agents';
import { getChatModelForConfig, resolveAIRequestConfig } from "@/lib/ai/model";
import { parseBodyWithAIConfig } from "@/lib/ai/request-config";
import { buildAgentErrorResponse } from "../utils";

const currentStyleSchema = z.object({
    name: z.string().trim().min(1),
    description: z.string().nullable().optional(),
    palette: z.object({
        primary: z.array(z.string()),
        accent: z.array(z.string()),
        background: z.string(),
    }),
    renderingCues: z.object({
        materials: z.array(z.string()),
        effects: z.array(z.string()),
        finish: z.string(),
    }),
});

const editStyleRequestShape = {
    currentStyle: currentStyleSchema,
    userRequest: z.string().trim().min(1, "currentStyle and userRequest are required"),
};

// POST /api/agents/edit-style
export async function POST(request: NextRequest) {
    let aiConfig = resolveAIRequestConfig();

    try {
        const parsed = parseBodyWithAIConfig(await request.json(), editStyleRequestShape);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        aiConfig = parsed.data.aiConfig;

        const modifiedStyle = await editStyleAgent(
            { currentStyle: parsed.data.currentStyle, userRequest: parsed.data.userRequest },
            getChatModelForConfig(aiConfig),
        );

        return NextResponse.json({ style: modifiedStyle });
    } catch (error) {
        console.error('Error editing style:', error);
        return buildAgentErrorResponse(error, aiConfig.chat, "Failed to edit style");
    }
}
