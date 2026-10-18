"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Loader2, Heart, Layers, Sparkles, Download } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";

interface BatchPromptRef {
  id: string;
  promptText: string;
  order: number;
}

interface ImageGroup {
  key: string;
  label: string;
  promptText: string;
  items: Array<{ image: GalleryImage; index: number }>;
}

const MAX_LABEL_LENGTH = 90;

/** Short readable title for a prompt that has no linked subject. */
function labelFromPrompt(text: string): string {
  const firstLine = text
    .split("\n")[0]
    .replace(/^Create (one )?(complete, )?(fully framed )?(isolated )?/i, "")
    .trim();
  const firstSentence = firstLine
    .split(/\.\s/)[0]
    .replace(/\s+as an? .*$/i, "")
    .replace(/\.$/, "");
  return firstSentence.length > MAX_LABEL_LENGTH
    ? `${firstSentence.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : firstSentence;
}

interface ImageGalleryProps {
  /** Batch prompts, used to order the subject groups. */
  prompts?: BatchPromptRef[];
  images: GalleryImage[];
  loading: boolean;
  fetchingMore: boolean;
  hasMore: boolean;
  totalImageCount: number | string;
  globalTransparency: boolean;
  showTransparent: Record<string, boolean>;
  processingTransparency: Record<string, boolean>;
  imageVersions: Record<string, number>;
  lastImageElementRef: (node: HTMLDivElement | null) => void;
  onToggleGlobalTransparency: () => void;
  onToggleFavorite: (e: React.MouseEvent, image: GalleryImage) => Promise<void>;
  onToggleTransparencyView: (e: React.MouseEvent, imageId: string) => void;
  onMakeTransparent: (e: React.MouseEvent | React.KeyboardEvent, image: GalleryImage, samplePoint?: { x: number; y: number }, forceOriginal?: boolean) => Promise<void>;
  onImageClick: (index: number) => void;
}

export const ImageGallery = memo(function ImageGallery({
  prompts,
  images,
  loading,
  fetchingMore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasMore: _hasMore,
  totalImageCount,
  globalTransparency,
  showTransparent,
  processingTransparency,
  imageVersions,
  lastImageElementRef,
  onToggleGlobalTransparency,
  onToggleFavorite,
  onToggleTransparencyView,
  onMakeTransparent,
  onImageClick,
}: ImageGalleryProps) {

  // Deduplicate images by id to prevent React key collisions
  const uniqueImages = useMemo(() => {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.id)) {
        return false;
      }
      seen.add(image.id);
      return true;
    });
  }, [images]);

  const [groupBySubject, setGroupBySubject] = useState(true);

  // One group per batch prompt (a subject in this batch), in prompt order.
  const groups = useMemo<ImageGroup[]>(() => {
    const byKey = new Map<string, ImageGroup>();
    uniqueImages.forEach((image, index) => {
      const batchPrompt = image.generation?.batchPrompt;
      const key = batchPrompt?.id ?? "ungrouped";
      let group = byKey.get(key);
      if (!group) {
        const text = batchPrompt?.promptText ?? "";
        group = {
          key,
          label: batchPrompt?.prompt?.subject?.name ?? (text ? labelFromPrompt(text) : "Other images"),
          promptText: text,
          items: [],
        };
        byKey.set(key, group);
      }
      group.items.push({ image, index });
    });

    const orderOf = new Map((prompts ?? []).map(p => [p.id, p.order]));
    return [...byKey.values()].sort(
      (a, b) => (orderOf.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (orderOf.get(b.key) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [uniqueImages, prompts]);

  const canGroup = groups.length > 1;
  const showGroups = groupBySubject && canGroup;

  const renderImageCard = (image: GalleryImage, index: number) => (
    <Card
      key={image.id}
      className="overflow-hidden group"
      ref={index === uniqueImages.length - 1 ? lastImageElementRef : null}
    >
      <div className="aspect-square bg-muted relative">
        <Image
          src={`/api/images/${image.id}/file?size=thumbnail${showTransparent[image.id] ? `&version=transparent&t=${imageVersions[image.id] || ''}` : ''}`}
          alt={image.fileName}
          fill
          className={`object-cover cursor-pointer ${showTransparent[image.id] ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
          onClick={() => onImageClick(index)}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />

        {/* Control buttons on card */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full bg-black/20 hover:bg-black/40 ${image.isFavorite ? 'text-red-500' : 'text-white'}`}
            onClick={(e) => onToggleFavorite(e, image)}
            title="Favorite"
          >
            <Heart className={`h-5 w-5 ${image.isFavorite ? 'fill-current' : ''}`} />
          </Button>

          {image.transparentFilePath ? (
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full bg-black/20 hover:bg-black/40 ${showTransparent[image.id] ? 'text-blue-400' : 'text-white'}`}
              onClick={(e) => onToggleTransparencyView(e, image.id)}
              title="Toggle Transparency"
            >
              <Layers className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/20 hover:bg-black/40 text-white"
              onClick={(e) => onMakeTransparent(e, image)}
              disabled={processingTransparency[image.id]}
              title="Make Transparent"
            >
              {processingTransparency[image.id] ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onImageClick(index)}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="secondary"
            asChild
          >
            <a href={`/api/images/${image.id}/file`} download={image.fileName}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );

  const gridClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Images</CardTitle>
          <CardDescription>Loading images...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uniqueImages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Images</CardTitle>
          <CardDescription>0 image(s) generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No images generated yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Images</CardTitle>
        <div className="flex items-center justify-between">
          <CardDescription>
            {totalImageCount} image(s) generated
          </CardDescription>
          <div className="flex items-center gap-2">
          {canGroup && (
            <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg">
              <Switch
                id="group-by-subject"
                checked={groupBySubject}
                onCheckedChange={setGroupBySubject}
              />
              <Label htmlFor="group-by-subject" className="cursor-pointer">
                Group by subject
              </Label>
            </div>
          )}
          <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg">
            <Switch
              id="global-transparency"
              checked={globalTransparency}
              onCheckedChange={onToggleGlobalTransparency}
            />
            <Label htmlFor="global-transparency" className="cursor-pointer">
              Transparency
            </Label>
          </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showGroups ? (
          <div className="space-y-8">
            {groups.map(group => {
              const favorites = group.items.filter(({ image }) => image.isFavorite).length;
              return (
                <section key={group.key} aria-label={group.label} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-4 border-b pb-2">
                    <h3 className="font-semibold leading-tight" title={group.promptText || undefined}>
                      {group.label}
                    </h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {group.items.length} image(s)
                      {favorites > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                          <Heart className="h-3 w-3 fill-current" />
                          {favorites}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={gridClass}>
                    {group.items.map(({ image, index }) => renderImageCard(image, index))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className={gridClass}>
            {uniqueImages.map((image, index) => renderImageCard(image, index))}
          </div>
        )}

        {fetchingMore && (
          <div className="flex justify-center py-4 mt-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
