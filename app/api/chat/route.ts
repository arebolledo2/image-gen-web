import { google } from "@ai-sdk/google";
import { streamText, tool, generateText } from "ai";
import { z } from "zod";
import * as queries from "@/lib/db/queries";
import { readImage } from "@/lib/storage/local-storage";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: google("gemini-2.5-flash"), // Using 2.5 Flash as requested
        messages,
        system: "You are an intelligent agent that helps the user manage their image generation workflow. You have access to the user's batches, styles, subjects, and images. You can also see and analyze images when asked. Always ask for clarification if a request is ambiguous. When analyzing an image, be detailed.",
        tools: {
            getRecentBatches: {
                description: "Get a list of the most recent image generation batches.",
                inputSchema: z.object({
                    count: z.number().optional().describe("Number of batches to return (default 5)."),
                }),
                execute: async ({ count }: { count?: number }) => {
                    const batches = await queries.getRecentBatches(count);
                    return batches;
                },
            },
            getBatchDetails: {
                description: "Get detailed information about a specific batch, including its prompts and generations.",
                inputSchema: z.object({
                    batchId: z.string().describe("The ID of the batch to retrieve."),
                }),
                execute: async ({ batchId }: { batchId: string }) => {
                    const batch = await queries.getBatchDetails(batchId);
                    if (!batch) return "Batch not found.";
                    return batch;
                },
            },
            getStyleDetails: {
                description: "Get details about a specific style",
                inputSchema: z.object({
                    styleId: z.string().describe("The ID of the style"),
                }),
                execute: async ({ styleId }: { styleId: string }) => {
                    const style = await queries.getStyleDetails(styleId);
                    if (!style) return "Style not found.";
                    return style;
                },
            },
            getSubjectDetails: {
                description: "Get details about a specific subject",
                inputSchema: z.object({
                    subjectId: z.string().describe("The ID of the subject"),
                }),
                execute: async ({ subjectId }: { subjectId: string }) => {
                    const subject = await queries.getSubjectDetails(subjectId);
                    if (!subject) return "Subject not found.";
                    return subject;
                },
            },
            analyzeImage: {
                description: "Analyze an image",
                inputSchema: z.object({
                    imageId: z.string().describe("The ID of the image to analyze"),
                    prompt: z.string().describe("The specific question or prompt about the image"),
                }),
                execute: async ({ imageId, prompt }: { imageId: string; prompt: string }) => {
                    const image = await queries.getImageDetails(imageId);
                    if (!image) return "Image not found.";

                    const imageBuffer = await readImage(image.filePath);

                    // Convert buffer to base64
                    const base64Image = imageBuffer.toString('base64');

                    // "Vision Worker" pattern: Call a vision model to analyze the image
                    const analysis = await generateText({
                        model: google("gemini-2.5-flash"), // Use Flash for fast vision analysis
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
            },
        },
    });

    return result.toTextStreamResponse();
}
