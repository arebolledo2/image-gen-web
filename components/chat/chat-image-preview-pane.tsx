"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GetImagesPreviewItem } from "./chat-tool-utils";

interface ChatImagePreviewPaneProps {
    images: GetImagesPreviewItem[];
    onClose: () => void;
    onSelectImage: (index: number) => void;
}

function formatDate(value?: string): string | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleDateString();
}

export function ChatImagePreviewPane({
    images,
    onClose,
    onSelectImage,
}: ChatImagePreviewPaneProps) {
    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                    <h3 className="text-sm font-semibold">Batch Image Preview</h3>
                    <p className="text-xs text-muted-foreground">{images.length} image(s)</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onClose}
                    aria-label="Close image preview pane"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="h-full min-h-0 flex-1">
                {images.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">
                        No images available for preview.
                    </div>
                ) : (
                    <div className="space-y-3 p-4">
                        {images.map((image, index) => {
                            const imageId = encodeURIComponent(image.id);
                            const thumbnailUrl = `/api/images/${imageId}/file?size=thumbnail`;
                            const batchLabel = image.batch || image.batchId || "Unknown Batch";
                            const createdAtLabel = formatDate(image.createdAt);

                            return (
                                <button
                                    key={image.id}
                                    type="button"
                                    onClick={() => onSelectImage(index)}
                                    className="flex w-full gap-3 rounded-lg border bg-muted/20 p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                                >
                                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                                        <Image
                                            src={thumbnailUrl}
                                            alt={image.fileName || image.prompt || image.id}
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                            loading="lazy"
                                            unoptimized
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="truncate text-xs font-medium">
                                            {image.fileName || image.id}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{batchLabel}</p>
                                        {image.prompt && (
                                            <p className="line-clamp-2 text-xs text-muted-foreground">{image.prompt}</p>
                                        )}
                                        {createdAtLabel && (
                                            <p className="text-xs text-muted-foreground">{createdAtLabel}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
