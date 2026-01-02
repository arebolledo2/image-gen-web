import { google } from "@ai-sdk/google";
import { ToolLoopAgent, tool, generateText, type InferAgentUIMessage } from "ai";
import { z } from "zod";
import * as queries from "@/lib/db/queries";
import { readImage } from "@/lib/storage/local-storage";

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
    model: google("gemini-2.5-flash"),
    instructions: "You are an intelligent agent that helps the user manage their image generation workflow. You have access to the user's batches, styles, subjects, and images. You can also see and analyze images when asked. Always ask for clarification if a request is ambiguous. When analyzing an image, be detailed.",
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
    },
});

export type ImageAgentUIMessage = InferAgentUIMessage<typeof imageAgent>;
