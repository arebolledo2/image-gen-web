"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import type { FileUIPart } from "ai";
import { X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatSidebar } from "./chat-sidebar-provider";

export function ChatSidebar() {
    const { isOpen, isVisible, close } = useChatSidebar();

    const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
        id: "sidebar-chat",
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

    if (!isVisible) return null;

    const isLoading = status !== "ready";

    const handleSendMessage = (content: {
        text: string;
        files: { url: string; mediaType?: string; filename?: string }[];
    }) => {
        if (!content.text.trim() && content.files.length === 0) return;

        const files: FileUIPart[] = content.files.map((file) => ({
            url: file.url,
            mediaType: file.mediaType ?? "application/octet-stream",
            filename: file.filename,
            type: "file",
        }));

        if (content.text.trim() && files.length > 0) {
            sendMessage({ text: content.text, files });
        } else if (content.text.trim()) {
            sendMessage({ text: content.text });
        } else {
            sendMessage({ files });
        }
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 lg:hidden"
                    onClick={close}
                />
            )}

            <div
                className={cn(
                    "fixed top-16 right-0 bottom-0 z-40 w-[420px] max-w-full",
                    "flex flex-col border-l bg-background shadow-xl",
                    "transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium text-sm">Chat</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={close}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <ChatMessages
                        messages={messages}
                        addToolApprovalResponse={addToolApprovalResponse}
                        onOpenGetImagesPreview={() => {}}
                    />
                </div>

                <div className="border-t p-3">
                    <ChatInput
                        onSubmit={handleSendMessage}
                        status={status}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </>
    );
}
