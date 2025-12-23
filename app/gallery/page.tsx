"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Heart, Sparkles, Layers, Search } from "lucide-react";
import { ImageGalleryModal, type GalleryImage } from "@/components/image-gallery-modal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useImageTransparency } from "@/hooks/useImageTransparency";
import { useSquishAnimation } from "@/hooks/use-squish-animation";
import { useAIAnimation } from "@/hooks/use-ai-animation";

export default function GalleryPage() {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const LIMIT = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Use shared transparency hook
  const {
    showTransparent,
    processingTransparency,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    makeTransparent: makeTransparentBase,
    toggleTransparencyView,
    setTolerance,
    setMode,
    setShowTransparent,
  } = useImageTransparency();

  // Use squish animation hook
  const {
    processingSquish,
    squishIntensity,
    squishFrameCount,
    squishAnimationType,
    squishAnimations,
    loadingSquishAnimations,
    selectedVersion,
    setSquishIntensity,
    setSquishFrameCount,
    setSquishAnimationType,
    setSelectedVersion,
    fetchSquishAnimations,
    generateSquishAnimation,
    deleteSquishAnimation,
  } = useSquishAnimation();

  const {
    processingAI,
    suggestingPrompt,
    aiPrompt,
    aiGridSize,
    aiAnimations,
    loadingAIAnimations,
    setAIPrompt,
    setAIGridSize,
    fetchAIAnimations,
    suggestAnimation,
    generateAIAnimation,
    deleteAIAnimation,
  } = useAIAnimation();

  const [globalTransparency, setGlobalTransparency] = useState(false);

  // Modal state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Wrapper to update images after transparency is applied
  const makeTransparent = async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage,
    samplePoint?: { x: number, y: number },
    forceOriginal?: boolean
  ) => {
    await makeTransparentBase(e, image, samplePoint, forceOriginal, (updatedImage) => {
      setImages(prev => prev.map(img =>
        img.id === image.id ? updatedImage : img
      ));
    });
  };

  const fetchImages = useCallback(async (currentOffset: number, isInitial: boolean = false, favOnly: boolean = false, searchTerm: string = "") => {
    if (isInitial) setLoading(true);
    else setFetchingMore(true);

    try {
      const url = new URL('/api/images', window.location.origin);
      url.searchParams.append('limit', LIMIT.toString());
      url.searchParams.append('offset', currentOffset.toString());
      url.searchParams.append('favoritesOnly', favOnly.toString());
      if (searchTerm) {
        url.searchParams.append('search', searchTerm);
      }

      const response = await fetch(url.toString());
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
    fetchImages(0, true, favoritesOnly, debouncedSearch);
  }, [fetchImages, favoritesOnly, debouncedSearch]);

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

  const handleOpenEditor = (imageId: string) => {
    router.push(`/editor/${imageId}?from=gallery`);
  };

  const toggleGlobalTransparency = () => {
    const newValue = !globalTransparency;
    setGlobalTransparency(newValue);
    
    const newShowTransparent = { ...showTransparent };
    images.forEach(image => {
      if (image.transparentFilePath) {
        newShowTransparent[image.id] = newValue;
      }
    });
    setShowTransparent(newShowTransparent);
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
        fetchImages(nextOffset, false, favoritesOnly, debouncedSearch);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, fetchingMore, hasMore, images.length, fetchImages, favoritesOnly, debouncedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground">
            Browse all your generated images
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search prompts or batches..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg shrink-0">
            <Switch 
              id="favorites-filter" 
              checked={favoritesOnly}
              onCheckedChange={setFavoritesOnly}
            />
            <Label htmlFor="favorites-filter" className="cursor-pointer">Favorites</Label>
          </div>
          <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg shrink-0">
            <Switch 
              id="global-transparency" 
              checked={globalTransparency}
              onCheckedChange={toggleGlobalTransparency}
            />
            <Label htmlFor="global-transparency" className="cursor-pointer">Transparency</Label>
          </div>
        </div>
      </div>

      {loading && images.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {debouncedSearch 
                  ? `No images found matching "${debouncedSearch}"`
                  : favoritesOnly 
                    ? "No favorited images yet." 
                    : "No images yet. Create and execute a batch to generate images!"}
              </p>
              {!favoritesOnly && !debouncedSearch && (
                <Link href="/batches/new">
                  <Button>Create a Batch</Button>
                </Link>
              )}
              {debouncedSearch && (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear Search
                </Button>
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
            onOpenEditor={handleOpenEditor}
            selectedVersion={selectedVersion}
            onSelectedVersionChange={(imageId: string, version: string) =>
              setSelectedVersion((prev) => ({ ...prev, [imageId]: version }))
            }
            squishAnimations={squishAnimations}
            aiAnimations={aiAnimations}
          />
        </>
      )}
    </div>
  );
}
