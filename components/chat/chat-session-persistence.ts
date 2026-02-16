interface MessageLike {
    id: string;
}

interface PersistenceDecisionParams<TMessage extends MessageLike> {
    activeSessionId: string | null;
    hydratedSessionId: string | null;
    messages: TMessage[];
    initialMessages: TMessage[];
}

interface PersistenceDecision {
    shouldPersist: boolean;
    nextHydratedSessionId: string | null;
}

interface SessionUpdatePersistenceParams {
    shouldPersistAfterHydration: boolean;
    messageCount: number;
    currentDigest: string;
    lastPersistedDigest: string | undefined;
}

export function getMessageDigest<TMessage extends MessageLike>(messages: TMessage[]): string {
    return JSON.stringify(messages);
}

export function isHydrationMessageSet<TMessage extends MessageLike>(
    messages: TMessage[],
    initialMessages: TMessage[]
): boolean {
    if (messages.length !== initialMessages.length) {
        return false;
    }

    return messages.every((message, index) => message.id === initialMessages[index]?.id);
}

export function getPersistenceDecision<TMessage extends MessageLike>({
    activeSessionId,
    hydratedSessionId,
    messages,
    initialMessages,
}: PersistenceDecisionParams<TMessage>): PersistenceDecision {
    if (!activeSessionId) {
        return {
            shouldPersist: false,
            nextHydratedSessionId: null,
        };
    }

    if (hydratedSessionId === activeSessionId) {
        return {
            shouldPersist: true,
            nextHydratedSessionId: activeSessionId,
        };
    }

    if (isHydrationMessageSet(messages, initialMessages)) {
        return {
            shouldPersist: false,
            nextHydratedSessionId: activeSessionId,
        };
    }

    return {
        shouldPersist: false,
        nextHydratedSessionId: null,
    };
}

export function shouldPersistSessionUpdate({
    shouldPersistAfterHydration,
    messageCount,
    currentDigest,
    lastPersistedDigest,
}: SessionUpdatePersistenceParams): boolean {
    if (!shouldPersistAfterHydration) {
        return false;
    }

    if (messageCount === 0) {
        return false;
    }

    return currentDigest !== lastPersistedDigest;
}
