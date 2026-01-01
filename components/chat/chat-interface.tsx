"use client";

import { useChat } from "@ai-sdk/react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";
import { toast } from "sonner";

export function ChatInterface() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: "/api/chat",
        onError: (err: Error) => {
            toast.error(`Error: ${err.message}`);
        }
    } as any) as any;

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
        }
    }, [messages]);

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
                    {messages.map((m: any) => (
                        <div
                            key={m.id}
                            className={cn(
                                "flex gap-3",
                                m.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            <Avatar className="h-8 w-8">
                                {m.role === "user" ? (
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
                                    m.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                )}
                            >
                                <div className="whitespace-pre-wrap">{m.content}</div>
                                {/* Render tool invocations/results if any */}
                                {m.toolInvocations?.map((toolInvocation: any) => {
                                    const toolCallId = toolInvocation.toolCallId;
                                    const addResult =
                                        'result' in toolInvocation ? toolInvocation.result : undefined;

                                    // Basic rendering for now, can be improved later
                                    return (
                                        <div key={toolCallId} className="mt-2 text-xs opacity-80 border-t pt-2 border-white/20">
                                            <div className="font-semibold">Tool: {toolInvocation.toolName}</div>
                                            {addResult && <div>Result: {JSON.stringify(addResult).substring(0, 100)}...</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
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
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Type your message..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !(input || '').trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    );
}
