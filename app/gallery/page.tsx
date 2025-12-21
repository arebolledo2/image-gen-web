"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Heart, Sparkles, Layers } from "lucide-react";
import { ImageGalleryModal, type GalleryImage } from "@/components/image-gallery-modal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const LIMIT = 20;

  // Transparency toggle state (image id -> boolean)
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});
  const [processingTransparency, setProcessingTransparency] = useState<Record<string, boolean>>({});
  const [transparencyTolerance, setTransparencyTolerance] = useState<Record<string, number>>({});
  const [transparencyMode, setTransparencyMode] = useState<Record<string, 'global' | 'flood'>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  // Modal state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const fetchImages = useCallback(async (currentOffset: number, isInitial: boolean = false, favOnly: boolean = false) => {
    if (isInitial) setLoading(true);
    else setFetchingMore(true);

    try {
      const response = await fetch(`/api/images?limit=${LIMIT}&offset=${currentOffset}&favoritesOnly=${favOnly}`);
      const data = await response.json();
      
      const newImages = data.images || [];
      if (isInitial) {
        setImages(newImages);
      } else {
        setImages(prev => [...prev, ...newImages]);
      }
      
      setHasMore(newImages.length === LIMIT);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchImages(0, true, favoritesOnly);
  }, [fetchImages, favoritesOnly]);

  const toggleFavorite = async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    const newStatus = !image.isFavorite;
    
    // Optimistic update
    setImages(prev => prev.map(img => img.id === image.id ? { ...img, isFavorite: newStatus } : img));

    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      // If we are in favorites-only view and we just unfavorited an image, remove it from the list
      if (favoritesOnly && !newStatus) {
        setImages(prev => prev.filter(img => img.id !== image.id));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setImages(prev => prev.map(img => img.id === image.id ? { ...img, isFavorite: !newStatus } : img));
    }
  };

  const makeTransparent = async (e: React.MouseEvent | React.KeyboardEvent, image: GalleryImage) => {
    e.stopPropagation();
    if (processingTransparency[image.id]) return;

    const tolerance = transparencyTolerance[image.id] ?? 30;
    const mode = transparencyMode[image.id] ?? 'global';

    setProcessingTransparency(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/transparent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerance, mode }),
      });

      if (!response.ok) {
        throw new Error('Failed to make image transparent');
      }

      const data = await response.json();
      
      // Update image in list with the new transparentFilePath
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, transparentFilePath: data.transparentFilePath } 
          : img
      ));

      // Update version to bust cache
      setImageVersions(prev => ({ ...prev, [image.id]: Date.now() }));

      // Automatically switch to transparent view
      setShowTransparent(prev => ({ ...prev, [image.id]: true }));
    } catch (error) {
      console.error('Error making image transparent:', error);
      alert('Failed to make image transparent');
    } finally {
      setProcessingTransparency(prev => ({ ...prev, [image.id]: false }));
    }
  };

  const toggleTransparencyView = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    setShowTransparent(prev => ({ ...prev, [imageId]: !prev[imageId] }));
  };

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastImageElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || fetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextOffset = images.length;
        setOffset(nextOffset);
        fetchImages(nextOffset, false, favoritesOnly);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, fetchingMore, hasMore, images.length, fetchImages, favoritesOnly]);

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground">
            Browse all your generated images
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg">
          <Switch 
            id="favorites-filter" 
            checked={favoritesOnly}
            onCheckedChange={setFavoritesOnly}
          />
          <Label htmlFor="favorites-filter" className="cursor-pointer">Favorites only</Label>
        </div>
      </div>

      {images.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {favoritesOnly 
                  ? "No favorited images yet." 
                  : "No images yet. Create and execute a batch to generate images!"}
              </p>
              {!favoritesOnly && (
                <Link href="/batches/new">
                  <Button>Create a Batch</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {images.length} image(s) found
          </div>

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
                    onClick={() => setSelectedImageIndex(index)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  
                  {/* Control buttons on card */}
                  <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full bg-black/20 hover:bg-black/40 ${image.isFavorite ? 'text-red-500' : 'text-white'}`}
                      onClick={(e) => toggleFavorite(e, image)}
                      title="Favorite"
                    >
                      <Heart className={`h-5 w-5 ${image.isFavorite ? 'fill-current' : ''}`} />
                    </Button>

                    {image.transparentFilePath ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-full bg-black/20 hover:bg-black/40 ${showTransparent[image.id] ? 'text-blue-400' : 'text-white'}`}
                        onClick={(e) => toggleTransparencyView(e, image.id)}
                        title="Toggle Transparency"
                      >
                        <Layers className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-black/20 hover:bg-black/40 text-white"
                        onClick={(e) => makeTransparent(e, image)}
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
                      onClick={() => setSelectedImageIndex(index)}
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
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate">
                      {image.fileName}
                    </p>
                    {image.generation.batch ? (
                      <Link
                        href={`/batches/${image.generation.batch.id}`}
                        className="text-xs text-muted-foreground hover:underline truncate block"
                      >
                        {image.generation.batch.name}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">
                        No batch
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {fetchingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          <ImageGalleryModal
            images={images}
            selectedIndex={selectedImageIndex}
            onClose={() => setSelectedImageIndex(null)}
            onNavigate={setSelectedImageIndex}
            onToggleFavorite={toggleFavorite}
            onMakeTransparent={makeTransparent}
            onToggleTransparencyView={toggleTransparencyView}
            showTransparent={showTransparent}
            processingTransparency={processingTransparency}
            transparencyTolerance={transparencyTolerance}
            onToleranceChange={(imageId, tolerance) =>
              setTransparencyTolerance((prev) => ({ ...prev, [imageId]: tolerance }))
            }
            transparencyMode={transparencyMode}
            onModeChange={(imageId, mode) =>
              setTransparencyMode((prev) => ({ ...prev, [imageId]: mode }))
            }
            imageVersions={imageVersions}
          />
        </>
      )}
    </div>
  );
}
