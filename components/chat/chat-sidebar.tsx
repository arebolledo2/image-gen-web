"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import type { FileUIPart } from "ai";
import { X, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatSidebar } from "./chat-sidebar-provider";
import { useAIModelSettings } from "@/components/providers/ai-model-settings-provider";
import { buildChatRequestOptions } from "./chat-request-options";

export function ChatSidebar() {
    const { isOpen, isVisible, close } = useChatSidebar();
    const { toRequestConfig } = useAIModelSettings();

    const { messages, sendMessage, status, setMessages, addToolApprovalResponse } = useChat({
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
        const requestOptions = buildChatRequestOptions(toRequestConfig());

        if (content.text.trim() && files.length > 0) {
            sendMessage({ text: content.text, files }, requestOptions);
        } else if (content.text.trim()) {
            sendMessage({ text: content.text }, requestOptions);
        } else {
            sendMessage({ files }, requestOptions);
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
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setMessages([])}
                            title="New chat"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={close}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
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
