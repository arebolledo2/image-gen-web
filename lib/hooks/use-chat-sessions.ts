"use client";

import { useCallback, useEffect, useState } from "react";

const SESSIONS_KEY = "chat-sessions-index";
const ACTIVE_SESSION_KEY = "chat-sessions-active";
const PANEL_OPEN_KEY = "chat-sessions-panel-open";

export interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

function loadSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions: ChatSession[]) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function loadActiveId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_SESSION_KEY);
}

function saveActiveId(id: string) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function useChatSessions() {
    const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(loadActiveId);
    const [isPanelOpen, setIsPanelOpen] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem(PANEL_OPEN_KEY) === "true";
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setIsLoaded(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    // Ensure there's always an active session
    useEffect(() => {
        if (!isLoaded) return;
        if (sessions.length === 0 || !activeSessionId || !sessions.find(s => s.id === activeSessionId)) {
            if (sessions.length > 0) {
                const mostRecent = sessions[0];
                setActiveSessionId(mostRecent.id);
                saveActiveId(mostRecent.id);
            } else {
                // Create initial session
                const id = crypto.randomUUID();
                const session: ChatSession = {
                    id,
                    title: "New Chat",
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                const next = [session];
                setSessions(next);
                saveSessions(next);
                setActiveSessionId(id);
                saveActiveId(id);
            }
        }
    }, [isLoaded, sessions, activeSessionId]);

    const createSession = useCallback(() => {
        const id = crypto.randomUUID();
        const session: ChatSession = {
            id,
            title: "New Chat",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setSessions(prev => {
            const next = [session, ...prev];
            saveSessions(next);
            return next;
        });
        setActiveSessionId(id);
        saveActiveId(id);
        return id;
    }, []);

    const deleteSession = useCallback((id: string) => {
        // Remove message history
        localStorage.removeItem(`chat-history-${id}`);
        setSessions(prev => {
            const next = prev.filter(s => s.id !== id);
            saveSessions(next);
            // If we deleted the active session, switch to the most recent remaining
            if (id === activeSessionId) {
                if (next.length > 0) {
                    setActiveSessionId(next[0].id);
                    saveActiveId(next[0].id);
                } else {
                    // Will be handled by the ensure-active-session effect
                    setActiveSessionId(null);
                }
            }
            return next;
        });
    }, [activeSessionId]);

    const switchSession = useCallback((id: string) => {
        setActiveSessionId(id);
        saveActiveId(id);
    }, []);

    const renameSession = useCallback((id: string, title: string) => {
        setSessions(prev => {
            const next = prev.map(s => s.id === id ? { ...s, title } : s);
            saveSessions(next);
            return next;
        });
    }, []);

    const updateSessionTimestamp = useCallback((id: string) => {
        setSessions(prev => {
            const next = prev.map(s => s.id === id ? { ...s, updatedAt: Date.now() } : s);
            // Re-sort by updatedAt desc
            next.sort((a, b) => b.updatedAt - a.updatedAt);
            saveSessions(next);
            return next;
        });
    }, []);

    const togglePanel = useCallback(() => {
        setIsPanelOpen(prev => {
            const next = !prev;
            localStorage.setItem(PANEL_OPEN_KEY, String(next));
            return next;
        });
    }, []);

    return {
        sessions,
        activeSessionId,
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
