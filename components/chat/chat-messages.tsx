"use client";

import React from "react";
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse
} from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { MessageSquare } from "lucide-react";
import { ChatToolRenderer } from "./chat-tool-renderer";
import type { UIMessage, ReasoningUIPart, ToolUIPart } from "ai";

interface ChatMessagesProps {
    messages: UIMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
    return (
        <Conversation className="h-full">
            <ConversationContent>
                {messages.length === 0 ? (
                    <ConversationEmptyState
                        icon={<MessageSquare className="size-12 opacity-20" />}
                        title="Agentic Workflow"
                        description="I can help you create styles, subjects, and generate image batches. What's on your mind?"
                    />
                ) : (
                    messages.map((message) => (
                        <Message key={message.id} from={message.role}>
                            <MessageContent>
                                {message.parts.map((part, index) => {
                                    if (part.type === "text") {
                                        return (
                                            <MessageResponse key={index}>
                                                {part.text}
                                            </MessageResponse>
                                        );
                                    }

                                    if (part.type === "reasoning") {
                                        const reasoningPart = part as ReasoningUIPart & { reasoning: string };
                                        return (
                                            <Reasoning key={index} isStreaming={message.role === "assistant" && index === message.parts.length - 1}>
                                                <ReasoningTrigger />
                                                <ReasoningContent>{reasoningPart.reasoning}</ReasoningContent>
                                            </Reasoning>
                                        );
                                    }

                                    if (part.type.startsWith("tool-")) {
                                        const toolPart = part as ToolUIPart;
                                        return (
                                            <ChatToolRenderer
                                                key={index}
                                                part={toolPart}
                                            />
                                        );
                                    }

                                    return null;
                                })}
                            </MessageContent>
                        </Message>
                    ))
                )}
            </ConversationContent>
            <ConversationScrollButton />
        </Conversation>
    );
}
