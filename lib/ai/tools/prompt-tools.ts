import { tool } from "ai";
import { z } from "zod";

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

        const result = await response.json();
        return {
            success: true,
            prompt: {
                name: result.name,
                template: result.template,
                tags: result.tags
            },
            message: `Generated prompt: "${result.template.substring(0, 100)}..."`
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

        const { adjustedPrompt } = await response.json();
        return {
            success: true,
            originalPrompt: params.basePrompt.substring(0, 50) + '...',
            adjustedPrompt: adjustedPrompt.substring(0, 100) + '...',
            fullPrompt: adjustedPrompt,
            message: 'Successfully adjusted prompt based on suggestion'
        };
    }
});
