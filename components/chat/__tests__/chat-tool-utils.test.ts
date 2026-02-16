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
                    batch: "Turret Batch",
                    prompt: "isometric turret asset",
                    isFavorite: true,
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
                    batch: "Turret Batch",
                    prompt: "isometric turret asset",
                    isFavorite: true,
                },
                {
                    id: "img-2",
                    batch: undefined,
                    prompt: undefined,
                    isFavorite: undefined,
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
            images: [{ id: "img-1", batch: undefined, prompt: "valid", isFavorite: undefined }],
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
