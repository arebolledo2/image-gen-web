"use client";

import React from "react";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";

interface ChatToolRendererProps {
    part: ToolUIPart;
}

export function ChatToolRenderer({ part }: ChatToolRendererProps) {
    const toolName = part.type.replace(/^tool-/, "");

    // You can customize icons or titles based on toolName here if needed
    const getToolTitle = (name: string) => {
        const titles: Record<string, string> = {
            getRecentBatches: "Fetching Recent Batches",
            getBatchDetails: "Getting Batch Info",
            getStyleDetails: "Checking Style",
            getSubjectDetails: "Exploring Subject",
            analyzeImage: "Analyzing Image",
            createStyle: "Crafting New Style",
            createSubject: "Developing Subject",
            createBatch: "Preparing Batch",
            executeBatch: "Launching Generation",
            getImages: "Retrieving Images",
            createPromptWithAI: "Synthesizing AI Prompt",
            adjustPrompt: "Refining Prompt",
        };
        return titles[name] || name;
    };

    return (
        <Tool className="my-2 border-primary/20 bg-background/50 backdrop-blur-sm">
            <ToolHeader
                type={part.type}
                state={part.state}
                title={getToolTitle(toolName)}
            />
            <ToolContent>
                {!!part.input && <ToolInput input={part.input as Record<string, unknown>} />}
                {(part.output || part.errorText) && (
                    <ToolOutput
                        output={part.output as Record<string, unknown>}
                        errorText={part.errorText}
                    />
                )}
            </ToolContent>
        </Tool>
    );
}
