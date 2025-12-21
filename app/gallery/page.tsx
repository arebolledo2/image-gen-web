"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ChevronLeft, ChevronRight, Heart, Sparkles, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Image {
  id: string;
  filePath: string;
  fileName: string;
  mediaType: string;
  isFavorite: boolean;
  transparentFilePath: string | null;
  createdAt: string;
  generation: {
    batch: {
      id: string;
      name: string;
    } | null;
  };
}

export default function GalleryPage() {
  const [images, setImages] = useState<Image[]>([]);
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
  const lastScrollTime = useRef(0);

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

  const toggleFavorite = async (e: React.MouseEvent, image: Image) => {
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

  const makeTransparent = async (e: React.MouseEvent | React.KeyboardEvent, image: Image) => {
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

  const navigateImage = useCallback((direction: 'next' | 'prev') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'next' && selectedImageIndex < images.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    } else if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  }, [selectedImageIndex, images.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 400) return; // Throttling 400ms

    if (e.deltaY > 0) {
      navigateImage('next');
      lastScrollTime.current = now;
    } else if (e.deltaY < 0) {
      navigateImage('prev');
      lastScrollTime.current = now;
    }
  }, [navigateImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'ArrowRight') navigateImage('next');
      if (e.key === 'ArrowLeft') navigateImage('prev');
      if (e.key === 'Escape') setSelectedImageIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, navigateImage]);

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

          <Dialog 
            open={selectedImageIndex !== null} 
            onOpenChange={(open) => !open && setSelectedImageIndex(null)}
          >
            <DialogContent
              className="!max-w-none w-screen h-screen flex flex-col p-0 overflow-hidden bg-black/95 border-none [&>button]:text-white [&>button]:z-50 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:scale-150 [&>button]:right-8 [&>button]:top-8"
              onWheel={handleWheel}
            >
              <DialogHeader className="sr-only">
                <DialogTitle>
                  {selectedImageIndex !== null ? images[selectedImageIndex].fileName : "Image Viewer"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 relative w-full h-full flex items-center justify-center group/modal overflow-hidden">
                {selectedImageIndex !== null && (
                  <>
                    <img
                      src={`/api/images/${images[selectedImageIndex].id}/file${showTransparent[images[selectedImageIndex].id] ? `?version=transparent&t=${imageVersions[images[selectedImageIndex].id] || ''}` : ''}`}
                      alt={images[selectedImageIndex].fileName}
                      className={`max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200 ${showTransparent[images[selectedImageIndex].id] ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
                    />
                    
                    {/* Navigation Arrows */}
                    <div className="absolute inset-x-4 flex items-center justify-between pointer-events-none">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 pointer-events-auto disabled:opacity-0"
                        onClick={() => navigateImage('prev')}
                        disabled={selectedImageIndex === 0}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 pointer-events-auto disabled:opacity-0"
                        onClick={() => navigateImage('next')}
                        disabled={selectedImageIndex === images.length - 1}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${images[selectedImageIndex].isFavorite ? 'text-red-500' : 'text-white'}`}
                        onClick={(e) => toggleFavorite(e, images[selectedImageIndex])}
                        title="Favorite"
                      >
                        <Heart className={`h-8 w-8 ${images[selectedImageIndex].isFavorite ? 'fill-current' : ''}`} />
                      </Button>

                      {images[selectedImageIndex].transparentFilePath ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${showTransparent[images[selectedImageIndex].id] ? 'text-blue-400' : 'text-white'}`}
                          onClick={(e) => toggleTransparencyView(e, images[selectedImageIndex].id)}
                          title="Toggle Transparency"
                        >
                          <Layers className="h-8 w-8" />
                        </Button>
                      ) : null}

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white ${processingTransparency[images[selectedImageIndex].id] ? 'animate-pulse' : ''}`}
                        onClick={(e) => makeTransparent(e, images[selectedImageIndex])}
                        disabled={processingTransparency[images[selectedImageIndex].id]}
                        title={images[selectedImageIndex].transparentFilePath ? "Redo Transparency" : "Make Transparent"}
                      >
                        {processingTransparency[images[selectedImageIndex].id] ? (
                          <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                          <Sparkles className="h-8 w-8" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40"
                        asChild
                      >
                        <a 
                          href={`/api/images/${images[selectedImageIndex].id}/file${showTransparent[images[selectedImageIndex].id] ? '?version=transparent' : ''}`} 
                          download={images[selectedImageIndex].fileName}
                          title="Download"
                        >
                          <Download className="h-8 w-8" />
                        </a>
                      </Button>
                    </div>

                    {/* Info Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 text-white text-xs bg-black/50 p-4 rounded backdrop-blur-sm opacity-0 group-hover/modal:opacity-100 transition-opacity flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p>Image {selectedImageIndex + 1} of {images.length}</p>
                        {images[selectedImageIndex].generation.batch && (
                          <p>Batch: {images[selectedImageIndex].generation.batch?.name}</p>
                        )}
                      </div>
                      
                      <div className="w-full md:w-64 space-y-4 pointer-events-auto bg-black/40 p-3 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="transparency-mode" className="text-white text-xs cursor-pointer">
                            {transparencyMode[images[selectedImageIndex].id] === 'flood' ? 'Flood-fill' : 'Global'} Mode
                          </Label>
                          <Switch
                            id="transparency-mode"
                            checked={transparencyMode[images[selectedImageIndex].id] === 'flood'}
                            onCheckedChange={(checked) => setTransparencyMode(prev => ({ ...prev, [images[selectedImageIndex].id]: checked ? 'flood' : 'global' }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="tolerance-slider" className="text-white text-xs">Tolerance: {transparencyTolerance[images[selectedImageIndex].id] ?? 30}</Label>
                          </div>
                          <Slider
                            id="tolerance-slider"
                            min={0}
                            max={255}
                            step={1}
                            value={[transparencyTolerance[images[selectedImageIndex].id] ?? 30]}
                            onValueChange={(vals) => setTransparencyTolerance(prev => ({ ...prev, [images[selectedImageIndex].id]: vals[0] }))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
