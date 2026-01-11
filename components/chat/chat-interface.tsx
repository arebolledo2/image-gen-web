"use client";

import React, { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Card } from "@/components/ui/card";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useChatHistory } from "@/lib/hooks/use-chat-history";

export function ChatInterface() {
    const { initialMessages, isLoaded, saveMessages } = useChatHistory("agent-chat");

    const { messages, sendMessage, status } = useChat({
        messages: initialMessages,
    });


    // Save messages to history whenever they change
    useEffect(() => {
        if (isLoaded && messages.length > 0) {
            saveMessages(messages);
        }
    }, [messages, isLoaded, saveMessages]);

    const handleSendMessage = (content: { text: string; files: { url: string; mediaType?: string; filename?: string }[] }) => {
        sendMessage(
            { text: content.text },
            {
                // @ts-expect-error - experimental_attachments may not be in the local type definition but is supported by the runtime
                experimental_attachments: content.files
            }
        );
    };

    const isLoading = status !== "ready";

    return (
        <Card className="flex flex-col h-[calc(100vh-130px)] shadow-lg overflow-hidden border-none bg-background/50 backdrop-blur-md">
            <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold flex items-center gap-2">
                    <span className="text-xl">🤖</span> Agentic Chat
                </h2>
                <p className="text-sm text-muted-foreground">
                    Orchestrate your game asset workflow with AI.
                </p>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <ChatMessages messages={messages} />
            </div>

            <div className="p-4 bg-transparent">
                <ChatInput
                    onSubmit={handleSendMessage}
                    status={status}
                    isLoading={isLoading}
                />
            </div>
        </Card>
    );
}
