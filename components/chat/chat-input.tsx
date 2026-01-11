"use client";

import React, { useState } from "react";
import {
    PromptInput,
    PromptInputTextarea,
    PromptInputSubmit,
    PromptInputAttachments,
    PromptInputAttachment,
    PromptInputFooter,
    PromptInputBody,
    PromptInputHeader,
    PromptInputTools,
    PromptInputActionMenu,
    PromptInputActionMenuTrigger,
    PromptInputActionMenuContent,
    PromptInputActionAddAttachments
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

interface ChatAttachment {
    url: string;
    mediaType?: string;
    filename?: string;
}

interface ChatInputProps {
    onSubmit: (message: { text: string; files: ChatAttachment[] }) => void;
    status: ChatStatus;
    isLoading: boolean;
}

export function ChatInput({ onSubmit, status, isLoading }: ChatInputProps) {
    const [text, setText] = useState("");

    const handleSubmit = (message: { text: string; files: ChatAttachment[] }) => {
        if (!message.text.trim() && message.files.length === 0) return;
        onSubmit(message);
        setText("");
    };

    return (
        <PromptInput
            onSubmit={handleSubmit}
            className="w-full relative shadow-sm rounded-xl border bg-background/50 backdrop-blur-sm"
            multiple
            accept="image/*"
        >
            <PromptInputHeader>
                <PromptInputAttachments>
                    {(attachment) => (
                        <PromptInputAttachment key={attachment.id} data={attachment} />
                    )}
                </PromptInputAttachments>
            </PromptInputHeader>
            <PromptInputBody>
                <PromptInputTextarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ask about batches, create styles, or analyze images..."
                    className="min-h-[100px] border-none shadow-none focus-visible:ring-0"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            e.currentTarget.form?.requestSubmit();
                        }
                    }}
                />
            </PromptInputBody>
            <PromptInputFooter className="flex justify-between items-center p-2 pt-0">
                <PromptInputTools>
                    <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                            <PromptInputActionAddAttachments label="Upload Image for Analysis" />
                        </PromptInputActionMenuContent>
                    </PromptInputActionMenu>
                </PromptInputTools>
                <PromptInputSubmit
                    status={status === "streaming" ? "streaming" : "ready"}
                    disabled={isLoading || (!text.trim() && true)} // Note: true is placeholder for attachments check but PromptInput handles its own state
                />
            </PromptInputFooter>
        </PromptInput>
    );
}
