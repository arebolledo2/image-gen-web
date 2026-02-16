import { tool } from "ai";
import { z } from "zod";

// Type for image data from API
interface ImageData {
    id: string;
    fileName: string;
    filePath: string;
    isFavorite: boolean;
    createdAt: string;
    generation?: {
        batch?: { id: string; name: string };
        batchPrompt?: { promptText: string };
    };
}

// Schema for querying images
const GetImagesSchema = z.object({
    batchId: z.string().optional().describe("Filter images by batch ID"),
    favoritesOnly: z.boolean().optional().describe("Only return favorited images"),
    search: z.string().optional().describe("Search images by batch name or prompt text"),
    limit: z.number().optional().default(20).describe("Maximum number of images to return"),
    offset: z.number().optional().default(0).describe("Number of images to skip (for pagination)")
});

export const getImages = tool({
    description: "Query generated images with optional filtering by batch, favorites, or search terms. Use this to see what images have been generated.",
    inputSchema: GetImagesSchema,
    execute: async (params) => {
        const toPromptSnippet = (promptText: unknown): string | undefined => {
            if (typeof promptText !== "string" || promptText.trim().length === 0) {
                return undefined;
            }

            const trimmed = promptText.trim();
            if (trimmed.length <= 100) {
                return trimmed;
            }

            return `${trimmed.slice(0, 100)}...`;
        };

        const searchParams = new URLSearchParams();

        if (params.batchId) searchParams.append('batchId', params.batchId);
        if (params.favoritesOnly) searchParams.append('favoritesOnly', 'true');
        if (params.search) searchParams.append('search', params.search);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        const url = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/images?${searchParams.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch images');
        }

        const { images, total, hasMore } = await response.json();

        return {
            count: images.length,
            total,
            hasMore,
            images: images.map((img: ImageData) => ({
                id: img.id,
                fileName: img.fileName,
                filePath: img.filePath,
                isFavorite: img.isFavorite,
                createdAt: img.createdAt,
                batchId: img.generation?.batch?.id,
                batch: img.generation?.batch?.name,
                prompt: toPromptSnippet(img.generation?.batchPrompt?.promptText),
            }))
        };
    }
});
