"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface ChatSidebarContextValue {
    isOpen: boolean;
    isVisible: boolean;
    toggle: () => void;
    close: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue>({
    isOpen: false,
    isVisible: true,
    toggle: () => {},
    close: () => {},
});

export const useChatSidebar = () => useContext(ChatSidebarContext);

const EXCLUDED_PATHS = ["/chat", "/editor"];
const STORAGE_KEY = "chat-sidebar-open";

export function ChatSidebarProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "true") setIsOpen(true);
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(isOpen));
    }, [isOpen]);

    const isVisible = !EXCLUDED_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
    );

    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
    const close = useCallback(() => setIsOpen(false), []);

    return (
        <ChatSidebarContext value={{ isOpen, isVisible, toggle, close }}>
            {children}
        </ChatSidebarContext>
    );
}
