import { tool } from "ai";
import { z } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.substring(0, maxLength)}...`;
}

// Schema for creating a prompt with AI
const CreatePromptWithAISchema = z.object({
    assetType: z.string().describe("Type of asset to generate (e.g., 'turret', 'enemy', 'background')"),
    styleName: z.string().optional().describe("Optional style name to apply"),
    styleKeywords: z.array(z.string()).optional().describe("Optional style keywords"),
    description: z.string().optional().describe("Additional description or requirements"),
    isTransparent: z.boolean().optional().default(true).describe("Whether to generate with transparent background")
});

// Schema for adjusting a prompt
const AdjustPromptSchema = z.object({
    basePrompt: z.string().describe("The original prompt text to adjust"),
    suggestion: z.string().describe("How to adjust the prompt (e.g., 'make it more colorful', 'add flames')"),
    promptStyle: z.enum(['terse', 'verbose', 'audio']).optional().default('terse').describe("Style of prompt to generate"),
    referencePrompts: z.array(z.string()).optional().describe("Optional reference prompts to guide the adjustment")
});

export const createPromptWithAI = tool({
    description: "Use AI to generate an optimized image generation prompt based on asset type, style, and description. This uses the specialized prompt creation agent to craft high-quality prompts.",
    inputSchema: CreatePromptWithAISchema,
    execute: async (params) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/agents/create-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create prompt with AI');
        }

        const result: unknown = await response.json();
        const promptPayload = isRecord(result) && isRecord(result.prompt) ? result.prompt : result;

        if (!isRecord(promptPayload) || typeof promptPayload.template !== "string") {
            throw new Error("Invalid create-prompt response: missing template");
        }

        const name = typeof promptPayload.name === "string" ? promptPayload.name : "AI Prompt";
        const tags = Array.isArray(promptPayload.tags)
            ? promptPayload.tags.filter((tag): tag is string => typeof tag === "string")
            : [];

        return {
            success: true,
            prompt: {
                name,
                template: promptPayload.template,
                tags
            },
            message: `Generated prompt: "${truncateText(promptPayload.template, 100)}"`
        };
    }
});

export const adjustPrompt = tool({
    description: "Adjust an existing prompt based on a suggestion using AI. Use this to refine or modify prompts while maintaining their core elements.",
    inputSchema: AdjustPromptSchema,
    execute: async (params) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/agents/adjust-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to adjust prompt');
        }

        const result: unknown = await response.json();
        const adjustedPrompt = isRecord(result)
            ? typeof result.adjustedPrompt === "string"
                ? result.adjustedPrompt
                : typeof result.promptText === "string"
                    ? result.promptText
                    : typeof result.prompt === "string"
                        ? result.prompt
                        : undefined
            : undefined;

        if (typeof adjustedPrompt !== "string") {
            throw new Error("Invalid adjust-prompt response: missing adjusted prompt text");
        }

        return {
            success: true,
            originalPrompt: truncateText(params.basePrompt, 50),
            adjustedPrompt: truncateText(adjustedPrompt, 100),
            fullPrompt: adjustedPrompt,
            message: 'Successfully adjusted prompt based on suggestion'
        };
    }
});
