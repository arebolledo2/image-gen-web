export interface ChatSession {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export interface ChatSessionsState {
    sessions: ChatSession[];
    activeSessionId: string | null;
}

interface ResolveBootstrapStateParams {
    sessions: ChatSession[];
    activeSessionId: string | null;
    isBrowser: boolean;
    createId: () => string;
    now: () => number;
}

interface ResolveDeleteSessionStateParams {
    currentState: ChatSessionsState;
    deleteId: string;
    createId: () => string;
    now: () => number;
}

function createSession(id: string, now: number): ChatSession {
    return {
        id,
        title: "New Chat",
        createdAt: now,
        updatedAt: now,
    };
}

function resolveActiveSessionId(sessions: ChatSession[], activeSessionId: string | null): string | null {
    if (sessions.length === 0) return null;
    if (activeSessionId && sessions.some((session) => session.id === activeSessionId)) {
        return activeSessionId;
    }
    return sessions[0].id;
}

export function resolveBootstrapState({
    sessions,
    activeSessionId,
    isBrowser,
    createId,
    now,
}: ResolveBootstrapStateParams): ChatSessionsState {
    const resolvedActiveSessionId = resolveActiveSessionId(sessions, activeSessionId);
    if (resolvedActiveSessionId) {
        return {
            sessions,
            activeSessionId: resolvedActiveSessionId,
        };
    }

    if (!isBrowser) {
        return {
            sessions: [],
            activeSessionId: null,
        };
    }

    const id = createId();
    const session = createSession(id, now());

    return {
        sessions: [session],
        activeSessionId: id,
    };
}

export function resolveDeleteSessionState({
    currentState,
    deleteId,
    createId,
    now,
}: ResolveDeleteSessionStateParams): ChatSessionsState {
    const remainingSessions = currentState.sessions.filter((session) => session.id !== deleteId);

    if (remainingSessions.length === 0) {
        const id = createId();
        const replacementSession = createSession(id, now());

        return {
            sessions: [replacementSession],
            activeSessionId: id,
        };
    }

    const nextActiveSessionId = currentState.activeSessionId === deleteId
        ? remainingSessions[0].id
        : resolveActiveSessionId(remainingSessions, currentState.activeSessionId);

    return {
        sessions: remainingSessions,
        activeSessionId: nextActiveSessionId,
    };
}
