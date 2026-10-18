"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { api } from "@/lib/api-client";
import type { ApiLineageImage } from "@/lib/types/api";

interface AIAssistButtonWithReferencesProps {
    onGenerate: (description: string, referenceImageIds: string[]) => Promise<void>;
    batchId: string;
    label?: string;
    title: string;
    description: string;
    placeholder: string;
    buttonVariant?: "default" | "outline" | "secondary";
}

export function AIAssistButtonWithReferences({
    onGenerate,
    batchId,
    label = "AI Adjust",
    title,
    description,
    placeholder,
    buttonVariant = "outline",
}: AIAssistButtonWithReferencesProps) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [lineageImages, setLineageImages] = useState<ApiLineageImage[]>([]);
    const [loadingImages, setLoadingImages] = useState(false);
    const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

    // Show the loading state as soon as a fetch is due, and reset the
    // selection when the dialog closes (adjusted during render, not in an effect)
    const fetchBatchId = open && batchId ? batchId : null;
    const [prevFetchBatchId, setPrevFetchBatchId] = useState<string | null>(null);
    if (prevFetchBatchId !== fetchBatchId) {
        setPrevFetchBatchId(fetchBatchId);
        if (fetchBatchId) setLoadingImages(true);
    }
    const [prevOpen, setPrevOpen] = useState(open);
    if (prevOpen !== open) {
        setPrevOpen(open);
        if (!open) setSelectedImageIds(new Set());
    }

    // Fetch lineage images when dialog opens
    useEffect(() => {
        if (!fetchBatchId) return;

        let cancelled = false;
        api.batches
            .lineageImages(fetchBatchId, 12)
            .then((data) => {
                if (!cancelled) setLineageImages(data.images);
            })
            .catch((error) => {
                console.error("Error fetching lineage images:", error);
            })
            .finally(() => {
                if (!cancelled) setLoadingImages(false);
            });

        return () => {
            cancelled = true;
        };
    }, [fetchBatchId]);

    const toggleImageSelection = (imageId: string) => {
        setSelectedImageIds((prev) => {
            const next = new Set(prev);
            if (next.has(imageId)) {
                next.delete(imageId);
            } else {
                next.add(imageId);
            }
            return next;
        });
    };

    const handleGenerate = async () => {
        if (!input.trim()) return;

        setLoading(true);
        try {
            await onGenerate(input, Array.from(selectedImageIds));
            setOpen(false);
            setInput("");
        } catch (error) {
            console.error("AI generation error:", error);
            toast.error("Failed to generate. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={buttonVariant} type="button">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {label}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Reference Images Gallery */}
                    {loadingImages ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : lineageImages.length > 0 ? (
                        <div className="space-y-2">
                            <Label>
                                Reference Images{" "}
                                <span className="text-muted-foreground font-normal">
                                    (select images to guide the AI)
                                </span>
                            </Label>
                            <div className="grid grid-cols-4 gap-2">
                                {lineageImages.map((image) => (
                                    <div
                                        key={image.id}
                                        className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${selectedImageIds.has(image.id)
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-muted-foreground/30"
                                            }`}
                                        onClick={() => toggleImageSelection(image.id)}
                                    >
                                        <Image
                                            src={`/api/images/${image.id}/file`}
                                            alt={image.fileName}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 25vw, 150px"
                                        />
                                        {selectedImageIds.has(image.id) && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="bg-primary rounded-full p-1">
                                                    <Check className="h-4 w-4 text-primary-foreground" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {selectedImageIds.size > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {selectedImageIds.size} image(s) selected as reference
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* Suggestion Input */}
                    <div className="space-y-2">
                        <Label htmlFor="ai-input">Suggestion</Label>
                        <Textarea
                            id="ai-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={placeholder}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !input.trim()}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate with AI
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
