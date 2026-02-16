import { describe, expect, it } from "vitest";
import {
    getMessageDigest,
    getPersistenceDecision,
    isHydrationMessageSet,
    shouldPersistSessionUpdate,
} from "../chat-session-persistence";

function message(id: string) {
    return { id };
}

describe("isHydrationMessageSet", () => {
    it("returns true when message ids match in order", () => {
        expect(isHydrationMessageSet([message("u1"), message("a1")], [message("u1"), message("a1")])).toBe(true);
    });

    it("returns false for different lengths", () => {
        expect(isHydrationMessageSet([message("u1")], [message("u1"), message("a1")])).toBe(false);
    });

    it("returns false when ids differ or order changes", () => {
        expect(isHydrationMessageSet([message("u1"), message("a1")], [message("u1"), message("a2")])).toBe(false);
        expect(isHydrationMessageSet([message("a1"), message("u1")], [message("u1"), message("a1")])).toBe(false);
    });
});

describe("getPersistenceDecision", () => {
    it("marks hydration complete without persisting on first matching frame", () => {
        const decision = getPersistenceDecision({
            activeSessionId: "s1",
            hydratedSessionId: null,
            messages: [message("u1"), message("a1")],
            initialMessages: [message("u1"), message("a1")],
        });

        expect(decision).toEqual({
            shouldPersist: false,
            nextHydratedSessionId: "s1",
        });
    });

    it("does not persist stale mismatched frame while switching sessions", () => {
        const decision = getPersistenceDecision({
            activeSessionId: "s2",
            hydratedSessionId: null,
            messages: [message("old-u1"), message("old-a1")],
            initialMessages: [message("new-u1"), message("new-a1")],
        });

        expect(decision).toEqual({
            shouldPersist: false,
            nextHydratedSessionId: null,
        });
    });

    it("persists once the session is hydrated", () => {
        const decision = getPersistenceDecision({
            activeSessionId: "s1",
            hydratedSessionId: "s1",
            messages: [message("u1"), message("a1"), message("u2")],
            initialMessages: [message("u1"), message("a1")],
        });

        expect(decision).toEqual({
            shouldPersist: true,
            nextHydratedSessionId: "s1",
        });
    });

    it("does not persist when no active session exists", () => {
        const decision = getPersistenceDecision({
            activeSessionId: null,
            hydratedSessionId: "s1",
            messages: [message("u1")],
            initialMessages: [message("u1")],
        });

        expect(decision).toEqual({
            shouldPersist: false,
            nextHydratedSessionId: null,
        });
    });
});

describe("getMessageDigest", () => {
    it("changes when message payload changes", () => {
        const before = getMessageDigest([{ id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] }]);
        const after = getMessageDigest([{ id: "m1", role: "user", parts: [{ type: "text", text: "hello world" }] }]);

        expect(before).not.toBe(after);
    });
});

describe("shouldPersistSessionUpdate", () => {
    it("returns false when update is not allowed after hydration", () => {
        expect(shouldPersistSessionUpdate({
            shouldPersistAfterHydration: false,
            messageCount: 2,
            currentDigest: "digest-a",
            lastPersistedDigest: "digest-b",
        })).toBe(false);
    });

    it("returns false for empty messages", () => {
        expect(shouldPersistSessionUpdate({
            shouldPersistAfterHydration: true,
            messageCount: 0,
            currentDigest: "digest-a",
            lastPersistedDigest: "digest-b",
        })).toBe(false);
    });

    it("returns false when digest is unchanged", () => {
        expect(shouldPersistSessionUpdate({
            shouldPersistAfterHydration: true,
            messageCount: 2,
            currentDigest: "digest-a",
            lastPersistedDigest: "digest-a",
        })).toBe(false);
    });

    it("returns true when digest changed after hydration", () => {
        expect(shouldPersistSessionUpdate({
            shouldPersistAfterHydration: true,
            messageCount: 2,
            currentDigest: "digest-b",
            lastPersistedDigest: "digest-a",
        })).toBe(true);
    });
});
