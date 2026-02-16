import { describe, expect, it } from "vitest";
import { loadMessagesFromStorage, parseStoredMessages } from "../chat-history-state";

describe("parseStoredMessages", () => {
    it("returns parsed messages for valid JSON arrays", () => {
        const parsed = parseStoredMessages(
            JSON.stringify([{ id: "m1", role: "user", parts: [] }])
        );

        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toMatchObject({ id: "m1", role: "user" });
    });

    it("returns an empty array for invalid JSON", () => {
        expect(parseStoredMessages("{invalid-json")).toEqual([]);
    });

    it("returns an empty array for non-array payloads", () => {
        expect(parseStoredMessages(JSON.stringify({ id: "m1" }))).toEqual([]);
    });
});

describe("loadMessagesFromStorage", () => {
    it("returns an empty array when storage key is missing", () => {
        const storage = {
            getItem: () => null,
        };

        expect(loadMessagesFromStorage(storage, "chat-history-missing")).toEqual([]);
    });

    it("reads the current storage key directly so key switches return correct messages", () => {
        const map: Record<string, string> = {
            "chat-history-a": JSON.stringify([{ id: "a1", role: "user", parts: [] }]),
            "chat-history-b": JSON.stringify([{ id: "b1", role: "assistant", parts: [] }]),
        };

        const storage = {
            getItem: (key: string) => map[key] ?? null,
        };

        const messagesA = loadMessagesFromStorage(storage, "chat-history-a");
        const messagesB = loadMessagesFromStorage(storage, "chat-history-b");

        expect(messagesA[0]).toMatchObject({ id: "a1", role: "user" });
        expect(messagesB[0]).toMatchObject({ id: "b1", role: "assistant" });
    });
});
