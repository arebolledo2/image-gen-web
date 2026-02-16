export interface GetImagesPreviewItem {
    id: string;
    batch?: string;
    prompt?: string;
    isFavorite?: boolean;
}

export interface GetImagesPreviewData {
    count?: number;
    total?: number;
    hasMore?: boolean;
    images: GetImagesPreviewItem[];
}

const BATCH_MUTATION_TOOLS = new Set(["createBatch", "executeBatch"]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isBatchMutationTool(toolName: string): boolean {
    return BATCH_MUTATION_TOOLS.has(toolName);
}

export function parseGetImagesOutput(output: unknown): GetImagesPreviewData | null {
    if (!isRecord(output)) {
        return null;
    }

    const rawImages = output.images;
    if (!Array.isArray(rawImages)) {
        return null;
    }

    const images: GetImagesPreviewItem[] = rawImages
        .filter(isRecord)
        .filter((image) => typeof image.id === "string")
        .map((image) => ({
            id: image.id as string,
            batch: typeof image.batch === "string" ? image.batch : undefined,
            prompt: typeof image.prompt === "string" ? image.prompt : undefined,
            isFavorite: typeof image.isFavorite === "boolean" ? image.isFavorite : undefined,
        }));

    return {
        count: typeof output.count === "number" ? output.count : undefined,
        total: typeof output.total === "number" ? output.total : undefined,
        hasMore: typeof output.hasMore === "boolean" ? output.hasMore : undefined,
        images,
    };
}
