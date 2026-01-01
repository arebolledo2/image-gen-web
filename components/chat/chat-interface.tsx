"use client";

import React from "react";

import { useChat } from "@ai-sdk/react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface ToolInvocation {
    toolCallId: string;
    toolName: string;
    result?: unknown;
}

interface TextPart {
    type: "text";
    text: string;
}

interface MessageData {
    id: string;
    role: "user" | "assistant" | "system" | "data";
    parts?: Array<TextPart | { type: string }>;
    content?: string; // For backward compatibility
    toolInvocations?: ToolInvocation[];
}

// Helper to extract text content from message parts
function getMessageContent(msg: MessageData): string {
    if (msg.parts) {
        return msg.parts
            .filter((part): part is TextPart => part.type === "text")
            .map(part => part.text)
            .join("");
    }
    return msg.content || "";
}

export function ChatInterface() {
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage, status } = useChat({
        onError: (err: Error) => {
            toast.error(`Error: ${err.message}`);
        }
    });

    const isLoading = status === "streaming" || status === "submitted";

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [messages]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        try {
            // In AI SDK v6, sendMessage takes a message object with parts
            await sendMessage({
                role: "user",
                parts: [{ type: "text" as const, text: inputValue }]
            });
            setInputValue("");
        } catch (submitError) {
            console.error("Failed to send message:", submitError);
            toast.error("Failed to send message");
        }
    }, [inputValue, isLoading, sendMessage]);

    return (
        <Card className="flex flex-col h-[calc(100vh-130px)] shadow-lg">
            <div className="p-4 border-b bg-muted/50">
                <h2 className="font-semibold flex items-center gap-2">
                    <span className="text-xl">🤖</span> Agentic Chat
                </h2>
                <p className="text-sm text-muted-foreground">
                    Ask about your batches, styles, or analyze images.
                </p>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground mt-20">
                            <p>No messages yet. Start a conversation!</p>
                        </div>
                    )}
                    {messages.map((m) => {
                        // Cast to our interface for type safety
                        const msg = m as unknown as MessageData;
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-3",
                                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <Avatar className="h-8 w-8">
                                    {msg.role === "user" ? (
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                            U
                                        </AvatarFallback>
                                    ) : (
                                        <AvatarFallback className="bg-muted">AI</AvatarFallback>
                                    )}
                                </Avatar>

                                <div
                                    className={cn(
                                        "rounded-lg p-3 max-w-[80%] text-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                    )}
                                >
                                    <div className="whitespace-pre-wrap">{getMessageContent(msg)}</div>
                                    {msg.toolInvocations?.map((toolInvocation: ToolInvocation) => {
                                        const toolCallId = toolInvocation.toolCallId;
                                        const toolResult =
                                            'result' in toolInvocation ? toolInvocation.result : undefined;

                                        return (
                                            <div key={toolCallId} className="mt-2 text-xs opacity-80 border-t pt-2 border-white/20">
                                                <div className="font-semibold">Tool: {toolInvocation.toolName}</div>
                                                {toolResult && <div>Result: {String(toolResult).substring(0, 100)}...</div>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted">AI</AvatarFallback>
                            </Avatar>
                            <div className="bg-muted rounded-lg p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2"
                >
                    <Input
                        value={inputValue}
                        onChange={handleInputChange}
                        placeholder="Ask about your batches, styles, or analyze an image..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
