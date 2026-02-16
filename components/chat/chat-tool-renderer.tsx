"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import type { ChatAddToolApproveResponseFunction, ToolUIPart } from "ai";
import { isBatchMutationTool, parseGetImagesOutput, type GetImagesPreviewData } from "./chat-tool-utils";

interface ChatToolRendererProps {
    part: ToolUIPart;
    addToolApprovalResponse: ChatAddToolApproveResponseFunction;
    onOpenGetImagesPreview: (data: GetImagesPreviewData) => void;
}

function formatToolTitle(name: string): string {
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
}

function GetImagesPreview({
    data,
    onOpenGetImagesPreview,
}: {
    data: NonNullable<ReturnType<typeof parseGetImagesOutput>>;
    onOpenGetImagesPreview: (data: GetImagesPreviewData) => void;
}) {
    return (
        <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Image Results {typeof data.count === "number" ? `(${data.count})` : ""}
                </p>
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.images.length === 0}
                    onClick={() => onOpenGetImagesPreview(data)}
                >
                    Preview in pane
                </Button>
            </div>
            {data.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">No images matched this query.</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {data.images.map((image) => {
                        const imageId = encodeURIComponent(image.id);
                        const fullImageUrl = `/api/images/${imageId}/file`;
                        const thumbnailUrl = `${fullImageUrl}?size=thumbnail`;

                        return (
                            <a
                                key={image.id}
                                href={fullImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-md border bg-muted/30 transition-colors hover:border-primary/50"
                            >
                                <Image
                                    src={thumbnailUrl}
                                    alt={image.prompt || image.id}
                                    className="h-24 w-full object-cover"
                                    width={256}
                                    height={96}
                                    loading="lazy"
                                    unoptimized
                                />
                                <div className="space-y-1 p-2">
                                    <p className="truncate text-xs font-medium">{image.batch || image.id}</p>
                                    {image.prompt && (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">{image.prompt}</p>
                                    )}
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function ChatToolRenderer({
    part,
    addToolApprovalResponse,
    onOpenGetImagesPreview,
}: ChatToolRendererProps) {
    const toolName = part.type.replace(/^tool-/, "");
    const shouldRenderApprovalActions =
        isBatchMutationTool(toolName) &&
        part.state === "approval-requested" &&
        typeof part.approval?.id === "string";

    const getImagesPreviewData = toolName === "getImages" ? parseGetImagesOutput(part.output) : null;
    const showToolOutput = (part.output || part.errorText) && !(toolName === "getImages" && getImagesPreviewData);

    return (
        <Tool className="my-2 border-primary/20 bg-background/50 backdrop-blur-sm">
            <ToolHeader
                type={part.type}
                state={part.state}
                title={formatToolTitle(toolName)}
            />
            <ToolContent>
                {!!part.input && <ToolInput input={part.input as Record<string, unknown>} />}

                {shouldRenderApprovalActions && (
                    <div className="space-y-3 p-4">
                        <p className="text-sm text-muted-foreground">
                            This action will mutate batches. Approve before continuing.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addToolApprovalResponse({
                                    id: part.approval.id,
                                    approved: false,
                                    reason: "Rejected in chat UI",
                                })}
                            >
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => addToolApprovalResponse({
                                    id: part.approval.id,
                                    approved: true,
                                })}
                            >
                                Approve
                            </Button>
                        </div>
                    </div>
                )}

                {isBatchMutationTool(toolName) && part.state === "approval-responded" && (
                    <div className="px-4 pb-4 text-sm">
                        <p className={part.approval.approved ? "text-blue-600" : "text-orange-600"}>
                            {part.approval.approved ? "Approval submitted. Running tool..." : "Approval rejected. Tool execution denied."}
                        </p>
                    </div>
                )}

                {isBatchMutationTool(toolName) && part.state === "output-denied" && (
                    <div className="px-4 pb-4 text-sm text-orange-600">
                        Tool execution was denied.
                        {part.approval.reason ? ` Reason: ${part.approval.reason}` : ""}
                    </div>
                )}

                {toolName === "getImages" && getImagesPreviewData && (
                    <GetImagesPreview
                        data={getImagesPreviewData}
                        onOpenGetImagesPreview={onOpenGetImagesPreview}
                    />
                )}

                {showToolOutput && (
                    <ToolOutput
                        output={part.output as Record<string, unknown>}
                        errorText={part.errorText}
                    />
                )}
            </ToolContent>
        </Tool>
    );
}
