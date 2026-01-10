"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ToolCallPart {
    type: `tool-${string}`;
    toolCallId: string;
    toolName: string;
    state: string;
    input?: unknown;
    output?: unknown;
    result?: unknown;
}

export function ChatInterface() {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage, status } = useChat();

    const isLoading = status !== "ready";

    // Debug logging
    console.log("Chat status:", status, "Messages count:", messages.length);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && status === "ready") {
            sendMessage({ text: input });
            setInput("");
        }
    };

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
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-3",
                                message.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <Avatar className="h-8 w-8">
                                {message.role === "user" ? (
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
                                    message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <div className="whitespace-pre-wrap">
                                    {messages.length > 0 && message.parts && message.parts.map((part, index) => {
                                        if (part.type === "text") {
                                            return <span key={index}>{part.text}</span>;
                                        }

                                        // Handle tool calls (type starts with 'tool-')
                                        if (part.type.startsWith('tool-')) {
                                            const toolPart = part as ToolCallPart;
                                            const toolName = toolPart.toolName;

                                            return (
                                                <div key={index} className="mt-2 text-xs opacity-80 border-t pt-2 border-white/20">
                                                    <div className="font-semibold">Tool: {toolName}</div>
                                                    {toolPart.state === "result" && toolPart.result !== undefined && (
                                                        <div>Result: {JSON.stringify(toolPart.result).substring(0, 100)}...</div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && status !== "error" && (
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
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your batches, styles, or analyze an image..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
