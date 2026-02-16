import { describe, expect, it } from "vitest";
import { isBatchMutationTool, parseGetImagesOutput } from "../chat-tool-utils";

describe("isBatchMutationTool", () => {
    it("returns true for batch mutation tools", () => {
        expect(isBatchMutationTool("createBatch")).toBe(true);
        expect(isBatchMutationTool("executeBatch")).toBe(true);
    });

    it("returns false for non-batch tools", () => {
        expect(isBatchMutationTool("getImages")).toBe(false);
        expect(isBatchMutationTool("createStyle")).toBe(false);
    });
});

describe("parseGetImagesOutput", () => {
    it("parses a valid getImages output payload", () => {
        const parsed = parseGetImagesOutput({
            count: 2,
            total: 5,
            hasMore: true,
            images: [
                {
                    id: "img-1",
                    fileName: "turret-01.png",
                    batchId: "batch-1",
                    batch: "Turret Batch",
                    prompt: "isometric turret asset",
                    isFavorite: true,
                    createdAt: "2026-02-16T00:00:00.000Z",
                    filePath: "/batches/batch-1/turret-01.png",
                },
                {
                    id: "img-2",
                },
            ],
        });

        expect(parsed).toEqual({
            count: 2,
            total: 5,
            hasMore: true,
            images: [
                {
                    id: "img-1",
                    fileName: "turret-01.png",
                    batchId: "batch-1",
                    batch: "Turret Batch",
                    prompt: "isometric turret asset",
                    isFavorite: true,
                    createdAt: "2026-02-16T00:00:00.000Z",
                    filePath: "/batches/batch-1/turret-01.png",
                },
                {
                    id: "img-2",
                    fileName: undefined,
                    batchId: undefined,
                    batch: undefined,
                    prompt: undefined,
                    isFavorite: undefined,
                    createdAt: undefined,
                    filePath: undefined,
                },
            ],
        });
    });

    it("filters out malformed image entries but keeps valid ones", () => {
        const parsed = parseGetImagesOutput({
            images: [
                { id: "img-1", prompt: "valid" },
                { prompt: "missing id" },
                "invalid",
            ],
        });

        expect(parsed).toEqual({
            count: undefined,
            total: undefined,
            hasMore: undefined,
            images: [{
                id: "img-1",
                fileName: undefined,
                batchId: undefined,
                batch: undefined,
                prompt: "valid",
                isFavorite: undefined,
                createdAt: undefined,
                filePath: undefined,
            }],
        });
    });

    it("keeps backward compatibility when metadata fields are missing", () => {
        const parsed = parseGetImagesOutput({
            images: [{ id: "img-1", batch: "Batch A", prompt: "legacy payload" }],
        });

        expect(parsed).toEqual({
            count: undefined,
            total: undefined,
            hasMore: undefined,
            images: [{
                id: "img-1",
                fileName: undefined,
                batchId: undefined,
                batch: "Batch A",
                prompt: "legacy payload",
                isFavorite: undefined,
                createdAt: undefined,
                filePath: undefined,
            }],
        });
    });

    it("drops malformed prompt values to avoid unsafe rendering", () => {
        const parsed = parseGetImagesOutput({
            images: [{ id: "img-1", prompt: 42 }],
        });

        expect(parsed).toEqual({
            count: undefined,
            total: undefined,
            hasMore: undefined,
            images: [{
                id: "img-1",
                fileName: undefined,
                batchId: undefined,
                batch: undefined,
                prompt: undefined,
                isFavorite: undefined,
                createdAt: undefined,
                filePath: undefined,
            }],
        });
    });

    it("returns null for non-object payloads", () => {
        expect(parseGetImagesOutput("invalid")).toBeNull();
        expect(parseGetImagesOutput(null)).toBeNull();
    });

    it("returns null when images is not an array", () => {
        expect(parseGetImagesOutput({ images: "invalid" })).toBeNull();
    });
});
