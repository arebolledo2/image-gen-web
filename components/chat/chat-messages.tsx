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
    MessageResponse,
    MessageAttachment,
    MessageAttachments,
} from "@/components/ai-elements/message";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { MessageSquare } from "lucide-react";
import { ChatToolRenderer } from "./chat-tool-renderer";
import type { ChatAddToolApproveResponseFunction, UIMessage, ReasoningUIPart, ToolUIPart, FileUIPart } from "ai";
import type { GetImagesPreviewData } from "./chat-tool-utils";

interface ChatMessagesProps {
    messages: UIMessage[];
    addToolApprovalResponse: ChatAddToolApproveResponseFunction;
    onOpenGetImagesPreview: (data: GetImagesPreviewData) => void;
}

export function ChatMessages({
    messages,
    addToolApprovalResponse,
    onOpenGetImagesPreview,
}: ChatMessagesProps) {
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

                                    if (part.type === "file") {
                                        return (
                                            <MessageAttachments
                                                key={index}
                                                className={message.role === "assistant" ? "ml-0" : undefined}
                                            >
                                                <MessageAttachment data={part as FileUIPart} />
                                            </MessageAttachments>
                                        );
                                    }

                                    if (part.type === "reasoning") {
                                        const reasoningPart = part as ReasoningUIPart & { reasoning?: string };
                                        const reasoningText = reasoningPart.text || reasoningPart.reasoning || "";
                                        if (!reasoningText) {
                                            return null;
                                        }

                                        return (
                                            <Reasoning key={index} isStreaming={message.role === "assistant" && index === message.parts.length - 1}>
                                                <ReasoningTrigger />
                                                <ReasoningContent>{reasoningText}</ReasoningContent>
                                            </Reasoning>
                                        );
                                    }

                                    if (part.type.startsWith("tool-")) {
                                        const toolPart = part as ToolUIPart;
                                        return (
                                            <ChatToolRenderer
                                                key={index}
                                                part={toolPart}
                                                addToolApprovalResponse={addToolApprovalResponse}
                                                onOpenGetImagesPreview={onOpenGetImagesPreview}
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
