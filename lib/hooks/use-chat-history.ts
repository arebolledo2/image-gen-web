"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UIMessage as Message } from "ai";

function loadMessages(storageKey: string): Message[] {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            return [];
        }
    }
    return [];
}

/**
 * Hook to manage chat history persistence in localStorage.
 * Supports dynamic chatId switching — reloads messages synchronously
 * during render so that consuming components always see the correct
 * initial messages for the current chatId.
 */
export function useChatHistory(chatId: string = "default-chat") {
    const storageKey = `chat-history-${chatId}`;

    const [initialMessages, setInitialMessages] = useState<Message[]>(
        () => loadMessages(storageKey)
    );
    const [isLoaded, setIsLoaded] = useState(false);
    const prevStorageKeyRef = useRef(storageKey);

    // Synchronously update initialMessages during render when chatId changes.
    // This avoids the one-render-behind problem that an effect would cause.
    if (storageKey !== prevStorageKeyRef.current) {
        prevStorageKeyRef.current = storageKey;
        setInitialMessages(loadMessages(storageKey));
    }

    useEffect(() => {
        const timeout = setTimeout(() => setIsLoaded(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    const saveMessages = useCallback((messages: Message[]) => {
        if (!isLoaded) return;
        localStorage.setItem(storageKey, JSON.stringify(messages));
    }, [isLoaded, storageKey]);

    const clearHistory = useCallback(() => {
        localStorage.removeItem(storageKey);
        setInitialMessages([]);
    }, [storageKey]);

    return {
        initialMessages,
        isLoaded,
        saveMessages,
        clearHistory,
    };
}
