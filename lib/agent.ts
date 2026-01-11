import { google } from "@ai-sdk/google";
import { ToolLoopAgent, tool, generateText, type InferAgentUIMessage } from "ai";
import { z } from "zod";
import * as queries from "@/lib/db/queries";
import { readImage } from "@/lib/storage/local-storage";
import {
    getAllStyles,
    createStyle,
    getAllSubjects,
    createSubject,
    createBatch,
    executeBatch,
    getImages,
    createPromptWithAI,
    adjustPrompt
} from "@/lib/ai/tools";

// Define schemas separately to infer types
const GetRecentBatchesSchema = z.object({
    count: z.number().optional().describe("Number of batches to return (default 5)."),
});

const GetBatchDetailsSchema = z.object({
    batchId: z.string().describe("The ID of the batch to retrieve."),
});

const GetStyleDetailsSchema = z.object({
    styleId: z.string().describe("The ID of the style"),
});

const GetSubjectDetailsSchema = z.object({
    subjectId: z.string().describe("The ID of the subject"),
});

const AnalyzeImageSchema = z.object({
    imageId: z.string().describe("The ID of the image to analyze"),
    prompt: z.string().describe("The specific question or prompt about the image"),
});

export const imageAgent = new ToolLoopAgent({
    model: google("gemini-3-flash-preview"),
    instructions: `You are an intelligent agent that helps users create and manage game assets through AI image generation.

You have access to the user's existing resources (batches, styles, subjects, images) and can create new ones.

**Game Asset Workflow:**
1. **Style**: Define visual appearance (color palette, materials, effects)
2. **Subject**: Define what to generate (enemies, turrets, items, backgrounds)
3. **Batch**: Create a collection of prompts with settings
4. **Execute**: Trigger background image generation
5. **Review**: Query and analyze generated images

**Your Capabilities:**
- Query existing styles, subjects, batches, and images
- Create new styles with custom color palettes and rendering cues
- Create new subjects for game assets
- Generate AI-optimized prompts for better results
- Create and execute image generation batches
- Analyze generated images

**Best Practices:**
- Ask clarifying questions when requests are ambiguous
- Suggest using existing resources before creating duplicates
- Recommend appropriate styles for game asset types
- Use AI prompt generation for complex requirements
- Provide helpful context about batch execution status

When the user wants to create game assets, guide them through the workflow naturally.`,
    tools: {
        getRecentBatches: tool({
            description: "Get a list of the most recent image generation batches.",
            inputSchema: GetRecentBatchesSchema,
            execute: async ({ count }) => {
                const batches = await queries.getRecentBatches(count);
                return batches;
            },
        }),
        getBatchDetails: tool({
            description: "Get detailed information about a specific batch, including its prompts and generations.",
            inputSchema: GetBatchDetailsSchema,
            execute: async ({ batchId }) => {
                const batch = await queries.getBatchDetails(batchId);
                if (!batch) return "Batch not found.";
                return batch;
            },
        }),
        getStyleDetails: tool({
            description: "Get details about a specific style",
            inputSchema: GetStyleDetailsSchema,
            execute: async ({ styleId }) => {
                const style = await queries.getStyleDetails(styleId);
                if (!style) return "Style not found.";
                return style;
            },
        }),
        getSubjectDetails: tool({
            description: "Get details about a specific subject",
            inputSchema: GetSubjectDetailsSchema,
            execute: async ({ subjectId }) => {
                const subject = await queries.getSubjectDetails(subjectId);
                if (!subject) return "Subject not found.";
                return subject;
            },
        }),
        analyzeImage: tool({
            description: "Analyze an image",
            inputSchema: AnalyzeImageSchema,
            execute: async ({ imageId, prompt }) => {
                const image = await queries.getImageDetails(imageId);
                if (!image) return "Image not found.";

                const imageBuffer = await readImage(image.filePath);

                // Convert buffer to base64
                const base64Image = imageBuffer.toString('base64');

                // "Vision Worker" pattern: Call a vision model to analyze the image
                const analysis = await generateText({
                    model: google("gemini-2.5-flash"),
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image", image: base64Image }
                            ]
                        }
                    ]
                });

                return {
                    imageId,
                    analysis: analysis.text
                };
            },
        }),
        // Game Asset Creation Tools
        getAllStyles,
        createStyle,
        getAllSubjects,
        createSubject,
        createBatch,
        executeBatch,
        getImages,
        createPromptWithAI,
        adjustPrompt,
    },
});

export type ImageAgentUIMessage = InferAgentUIMessage<typeof imageAgent>;
