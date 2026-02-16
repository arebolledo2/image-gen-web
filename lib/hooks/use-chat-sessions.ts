"use client";

import { useCallback, useEffect, useState } from "react";
import {
    type ChatSession,
    type ChatSessionsState,
    resolveBootstrapState,
    resolveDeleteSessionState,
} from "./chat-session-state";

const SESSIONS_KEY = "chat-sessions-index";
const ACTIVE_SESSION_KEY = "chat-sessions-active";
const PANEL_OPEN_KEY = "chat-sessions-panel-open";

interface BootstrapResult {
    initialState: ChatSessionsState;
    shouldPersistInitialState: boolean;
}

function loadSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? (parsed as ChatSession[]) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions: ChatSession[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function loadActiveId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function saveActiveId(id: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

function persistState(state: ChatSessionsState) {
    if (typeof window === "undefined") return;
    saveSessions(state.sessions);
    if (state.activeSessionId) {
        saveActiveId(state.activeSessionId);
    }
}

function shouldPersistBootstrapState(
    persistedSessions: ChatSession[],
    persistedActiveSessionId: string | null,
    resolvedState: ChatSessionsState
): boolean {
    return (
        persistedSessions.length !== resolvedState.sessions.length ||
        persistedActiveSessionId !== resolvedState.activeSessionId
    );
}

function createBootstrapResult(): BootstrapResult {
    const persistedSessions = loadSessions();
    const persistedActiveSessionId = loadActiveId();

    const initialState = resolveBootstrapState({
        sessions: persistedSessions,
        activeSessionId: persistedActiveSessionId,
        isBrowser: typeof window !== "undefined",
        createId: () => crypto.randomUUID(),
        now: () => Date.now(),
    });

    return {
        initialState,
        shouldPersistInitialState: shouldPersistBootstrapState(
            persistedSessions,
            persistedActiveSessionId,
            initialState
        ),
    };
}

export type { ChatSession } from "./chat-session-state";

export function useChatSessions() {
    const [bootstrap] = useState<BootstrapResult>(createBootstrapResult);
    const [sessionState, setSessionState] = useState<ChatSessionsState>(() => bootstrap.initialState);
    const [isPanelOpen, setIsPanelOpen] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(PANEL_OPEN_KEY) === "true";
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setIsLoaded(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!bootstrap.shouldPersistInitialState) return;
        persistState(bootstrap.initialState);
    }, [bootstrap]);

    const createSession = useCallback(() => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const session: ChatSession = {
            id,
            title: "New Chat",
            createdAt: now,
            updatedAt: now,
        };

        setSessionState((prevState) => {
            const nextState: ChatSessionsState = {
                sessions: [session, ...prevState.sessions],
                activeSessionId: id,
            };
            persistState(nextState);
            return nextState;
        });

        return id;
    }, []);

    const deleteSession = useCallback((id: string) => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(`chat-history-${id}`);
        }

        setSessionState((prevState) => {
            const nextState = resolveDeleteSessionState({
                currentState: prevState,
                deleteId: id,
                createId: () => crypto.randomUUID(),
                now: () => Date.now(),
            });
            persistState(nextState);
            return nextState;
        });
    }, []);

    const switchSession = useCallback((id: string) => {
        setSessionState((prevState) => {
            if (prevState.activeSessionId === id) return prevState;
            if (!prevState.sessions.some((session) => session.id === id)) return prevState;

            const nextState: ChatSessionsState = {
                sessions: prevState.sessions,
                activeSessionId: id,
            };

            persistState(nextState);
            return nextState;
        });
    }, []);

    const renameSession = useCallback((id: string, title: string) => {
        setSessionState((prevState) => {
            let changed = false;

            const nextSessions = prevState.sessions.map((session) => {
                if (session.id !== id) return session;
                changed = true;
                return { ...session, title };
            });

            if (!changed) return prevState;

            const nextState: ChatSessionsState = {
                sessions: nextSessions,
                activeSessionId: prevState.activeSessionId,
            };
            persistState(nextState);
            return nextState;
        });
    }, []);

    const updateSessionTimestamp = useCallback((id: string) => {
        setSessionState((prevState) => {
            let changed = false;

            const nextSessions = prevState.sessions
                .map((session) => {
                    if (session.id !== id) return session;
                    changed = true;
                    return { ...session, updatedAt: Date.now() };
                })
                .sort((a, b) => b.updatedAt - a.updatedAt);

            if (!changed) return prevState;

            const nextState: ChatSessionsState = {
                sessions: nextSessions,
                activeSessionId: prevState.activeSessionId,
            };
            persistState(nextState);
            return nextState;
        });
    }, []);

    const togglePanel = useCallback(() => {
        setIsPanelOpen((prevOpen) => {
            const nextOpen = !prevOpen;
            if (typeof window !== "undefined") {
                localStorage.setItem(PANEL_OPEN_KEY, String(nextOpen));
            }
            return nextOpen;
        });
    }, []);

    return {
        sessions: sessionState.sessions,
        activeSessionId: sessionState.activeSessionId,
        isPanelOpen,
        isLoaded,
        createSession,
        deleteSession,
        switchSession,
        renameSession,
        updateSessionTimestamp,
        togglePanel,
    };
}
