export interface GetImagesPreviewItem {
    id: string;
    fileName?: string;
    batchId?: string;
    batch?: string;
    prompt?: string;
    isFavorite?: boolean;
    createdAt?: string;
    filePath?: string;
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
            fileName: typeof image.fileName === "string" ? image.fileName : undefined,
            batchId: typeof image.batchId === "string" ? image.batchId : undefined,
            batch: typeof image.batch === "string" ? image.batch : undefined,
            prompt: typeof image.prompt === "string" ? image.prompt : undefined,
            isFavorite: typeof image.isFavorite === "boolean" ? image.isFavorite : undefined,
            createdAt: typeof image.createdAt === "string" ? image.createdAt : undefined,
            filePath: typeof image.filePath === "string" ? image.filePath : undefined,
        }));

    return {
        count: typeof output.count === "number" ? output.count : undefined,
        total: typeof output.total === "number" ? output.total : undefined,
        hasMore: typeof output.hasMore === "boolean" ? output.hasMore : undefined,
        images,
    };
}
