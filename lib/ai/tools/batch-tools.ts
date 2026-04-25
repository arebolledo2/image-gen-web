import { tool } from "ai";
import { z } from "zod";

// Schema for batch prompt
const BatchPromptSchema = z.object({
    promptText: z.string().describe("The full prompt text for image generation"),
    promptId: z.string().optional().describe("Optional: ID of an existing prompt template to use"),
    overrides: z.record(z.string(), z.any()).optional().describe("Optional parameter overrides for this specific prompt")
});

// Schema for batch defaults
const BatchDefaultsSchema = z.object({
    aspectRatio: z.string().optional().describe("Default aspect ratio (e.g., '1:1', '16:9')"),
    resolution: z.string().optional().describe("Default resolution"),
    count: z.number().optional().describe("Number of images to generate per prompt")
});

// Schema for creating a batch
const CreateBatchSchema = z.object({
    name: z.string().describe("Name for the batch"),
    description: z.string().optional().describe("Optional description of the batch"),
    provider: z.enum(['openai', 'openrouter', 'gemini', 'gemini3', 'comfyui']).optional().default('openai').describe("Image generation provider"),
    prompts: z.array(BatchPromptSchema).min(1).describe("Array of prompts to generate images for"),
    defaults: BatchDefaultsSchema.optional().describe("Default generation parameters")
});

// Schema for executing a batch
const ExecuteBatchSchema = z.object({
    batchId: z.string().describe("The ID of the batch to execute")
});

export const createBatch = tool({
    description: "Create a new image generation batch with one or more prompts. This prepares the batch but does NOT execute it. Use executeBatch afterward to start generation.",
    inputSchema: CreateBatchSchema,
    needsApproval: true,
    execute: async (params) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/batches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create batch');
        }

        const { batch } = await response.json();
        return {
            success: true,
            batch: {
                id: batch.id,
                name: batch.name,
                description: batch.description,
                provider: batch.provider,
                promptCount: params.prompts.length,
                status: batch.status
            },
            message: `Successfully created batch "${batch.name}" with ${params.prompts.length} prompt(s). Use executeBatch with ID ${batch.id} to start generation.`
        };
    }
});

export const executeBatch = tool({
    description: "Execute a batch to start image generation. This queues the batch jobs in Inngest. The batch must have been created first using createBatch.",
    inputSchema: ExecuteBatchSchema,
    needsApproval: true,
    execute: async ({ batchId }) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/batches/${batchId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to execute batch');
        }

        const result = await response.json();
        return {
            success: true,
            batchId: result.batchId,
            jobsQueued: result.message,
            message: `Batch execution started. ${result.message}`
        };
    }
});
