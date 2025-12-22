"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, Layers, Sparkles, Download } from "lucide-react";
import { memo, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";

interface ImageGalleryProps {
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
  images,
  loading,
  fetchingMore,
  hasMore,
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
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
  }, []);

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

  if (images.length === 0) {
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
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <Card
              key={image.id}
              className="overflow-hidden group"
              ref={index === images.length - 1 ? lastImageElementRef : null}
            >
              <div className="aspect-square bg-muted relative">
                <img
                  src={`/api/images/${image.id}/file${showTransparent[image.id] ? `?version=transparent&t=${imageVersions[image.id] || ''}` : ''}`}
                  alt={image.fileName}
                  className={`w-full h-full object-cover cursor-pointer ${showTransparent[image.id] ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
                  onClick={() => onImageClick(index)}
                  onError={handleImageError}
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
          ))}
        </div>

        {fetchingMore && (
          <div className="flex justify-center py-4 mt-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
