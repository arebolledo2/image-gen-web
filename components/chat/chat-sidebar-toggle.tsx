"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatSidebar } from "./chat-sidebar-provider";

export function ChatSidebarToggle() {
    const { isOpen, isVisible, toggle } = useChatSidebar();

    if (!isVisible || isOpen) return null;

    return (
        <Button
            onClick={toggle}
            size="lg"
            className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full p-0 shadow-lg"
        >
            <MessageSquare className="h-5 w-5" />
        </Button>
    );
}
