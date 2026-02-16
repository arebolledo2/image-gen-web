"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UIMessage as Message } from "ai";
import { loadMessagesFromStorage } from "./chat-history-state";

function getLocalStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
}

/**
 * Hook to manage chat history persistence in localStorage.
 * Supports dynamic chatId switching — reloads messages synchronously
 * during render so that consuming components always see the correct
 * initial messages for the current chatId.
 */
export function useChatHistory(chatId: string = "default-chat") {
    const storageKey = `chat-history-${chatId}`;

    const [refreshVersion, setRefreshVersion] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const initialMessages = useMemo<Message[]>(
        () => {
            void refreshVersion;
            return loadMessagesFromStorage(getLocalStorage(), storageKey);
        },
        [storageKey, refreshVersion]
    );

    useEffect(() => {
        const timeout = setTimeout(() => setIsLoaded(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    const saveMessages = useCallback((messages: Message[]) => {
        if (!isLoaded) return;
        const storage = getLocalStorage();
        if (!storage) return;
        storage.setItem(storageKey, JSON.stringify(messages));
    }, [isLoaded, storageKey]);

    const clearHistory = useCallback(() => {
        const storage = getLocalStorage();
        if (storage) {
            storage.removeItem(storageKey);
        }
        setRefreshVersion((version) => version + 1);
    }, [storageKey]);

    return {
        initialMessages,
        isLoaded,
        saveMessages,
        clearHistory,
    };
}
