import { describe, expect, it } from "vitest";
import {
    type ChatSession,
    resolveBootstrapState,
    resolveDeleteSessionState,
} from "../chat-session-state";

function makeSession(id: string, timestamp: number): ChatSession {
    return {
        id,
        title: `Session ${id}`,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

describe("resolveBootstrapState", () => {
    it("keeps an existing valid active session", () => {
        const sessions = [makeSession("s1", 1), makeSession("s2", 2)];

        const result = resolveBootstrapState({
            sessions,
            activeSessionId: "s2",
            isBrowser: true,
            createId: () => "new-id",
            now: () => 123,
        });

        expect(result.sessions).toEqual(sessions);
        expect(result.activeSessionId).toBe("s2");
    });

    it("selects the first session when persisted active session is missing", () => {
        const sessions = [makeSession("s1", 1), makeSession("s2", 2)];

        const result = resolveBootstrapState({
            sessions,
            activeSessionId: "missing",
            isBrowser: true,
            createId: () => "new-id",
            now: () => 123,
        });

        expect(result.sessions).toEqual(sessions);
        expect(result.activeSessionId).toBe("s1");
    });

    it("creates an initial session when none exist in browser context", () => {
        const result = resolveBootstrapState({
            sessions: [],
            activeSessionId: null,
            isBrowser: true,
            createId: () => "created-session",
            now: () => 999,
        });

        expect(result).toEqual({
            sessions: [
                {
                    id: "created-session",
                    title: "New Chat",
                    createdAt: 999,
                    updatedAt: 999,
                },
            ],
            activeSessionId: "created-session",
        });
    });
});

describe("resolveDeleteSessionState", () => {
    it("keeps active session when deleting a non-active session", () => {
        const currentState = {
            sessions: [makeSession("s1", 1), makeSession("s2", 2)],
            activeSessionId: "s1",
        };

        const result = resolveDeleteSessionState({
            currentState,
            deleteId: "s2",
            createId: () => "new-id",
            now: () => 100,
        });

        expect(result).toEqual({
            sessions: [makeSession("s1", 1)],
            activeSessionId: "s1",
        });
    });

    it("switches active session to most recent remaining when deleting active session", () => {
        const currentState = {
            sessions: [makeSession("s1", 1), makeSession("s2", 2), makeSession("s3", 3)],
            activeSessionId: "s2",
        };

        const result = resolveDeleteSessionState({
            currentState,
            deleteId: "s2",
            createId: () => "new-id",
            now: () => 100,
        });

        expect(result).toEqual({
            sessions: [makeSession("s1", 1), makeSession("s3", 3)],
            activeSessionId: "s1",
        });
    });

    it("auto-creates a replacement session when deleting the last remaining session", () => {
        const result = resolveDeleteSessionState({
            currentState: {
                sessions: [makeSession("s1", 1)],
                activeSessionId: "s1",
            },
            deleteId: "s1",
            createId: () => "replacement",
            now: () => 555,
        });

        expect(result).toEqual({
            sessions: [
                {
                    id: "replacement",
                    title: "New Chat",
                    createdAt: 555,
                    updatedAt: 555,
                },
            ],
            activeSessionId: "replacement",
        });
    });
});
