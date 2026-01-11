"use client";

import { useEffect, useState } from "react";
import { UIMessage as Message } from "ai";

/**
 * Hook to manage chat history persistence in localStorage.
 */
export function useChatHistory(chatId: string = "default-chat") {
    const storageKey = `chat-history-${chatId}`;

    const [initialMessages, setInitialMessages] = useState<Message[]>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error("Failed to parse chat history", e);
                }
            }
        }
        return [];
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Use a small delay to avoid "synchronous setState in effect" lint error
        // which can cause cascading renders.
        const timeout = setTimeout(() => setIsLoaded(true), 0);
        return () => clearTimeout(timeout);
    }, []);

    const saveMessages = (messages: Message[]) => {
        if (!isLoaded) return;
        localStorage.setItem(storageKey, JSON.stringify(messages));
    };

    const clearHistory = () => {
        localStorage.removeItem(storageKey);
        setInitialMessages([]);
    };

    return {
        initialMessages,
        isLoaded,
        saveMessages,
        clearHistory,
    };
}
