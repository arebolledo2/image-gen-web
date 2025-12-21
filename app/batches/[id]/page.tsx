"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Trash2, ArrowLeft, Download, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  status: string;
  provider: 'gemini' | 'comfyui';
  createdAt: string;
  completedAt: string | null;
  defaults: any;
  batchPrompts: any[];
  generations: any[];
}

interface Image {
  id: string;
  filePath: string;
  fileName: string;
  mediaType: string;
  isFavorite: boolean;
  createdAt: string;
  generation: {
    batch: {
      id: string;
      name: string;
    } | null;
  };
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Image gallery state
  const [images, setImages] = useState<Image[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageOffset, setImageOffset] = useState(0);
  const IMAGES_LIMIT = 20;

  // Modal state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const lastScrollTime = useRef(0);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchBatch();
    }
  }, [params.id]);

  const fetchBatch = async () => {
    try {
      const response = await fetch(`/api/batches/${params.id}`);
      const data = await response.json();
      setBatch(data.batch);
    } catch (error) {
      console.error('Error fetching batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const response = await fetch(`/api/batches/${params.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to execute batch');
      }

      alert('Batch execution started! This may take a while.');
      // Refresh batch data
      await fetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      alert('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await fetch(`/api/batches/${params.id}`, {
        method: 'DELETE',
      });
      router.push('/batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
    }
  };

  const fetchImages = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
    if (!params.id) return;

    if (isInitial) setLoadingImages(true);
    else setFetchingMore(true);

    try {
      const response = await fetch(`/api/images?batchId=${params.id}&limit=${IMAGES_LIMIT}&offset=${currentOffset}`);
      const data = await response.json();

      const newImages = data.images || [];
      if (isInitial) {
        setImages(newImages);
      } else {
        setImages(prev => [...prev, ...newImages]);
      }

      setHasMore(newImages.length === IMAGES_LIMIT);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoadingImages(false);
      setFetchingMore(false);
    }
  }, [params.id, IMAGES_LIMIT]);

  // Fetch images when batch data is available
  useEffect(() => {
    if (batch && batch.id) {
      fetchImages(0, true);
    }
  }, [batch, fetchImages]);

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
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setImages(prev => prev.map(img => img.id === image.id ? { ...img, isFavorite: !newStatus } : img));
    }
  };

  // Infinite scroll observer
  const lastImageElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingImages || fetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextOffset = images.length;
        setImageOffset(nextOffset);
        fetchImages(nextOffset);
      }
    });

    if (node) observer.current.observe(node);
  }, [loadingImages, fetchingMore, hasMore, images.length, fetchImages]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return <div>Batch not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const totalImageCount = images.length > 0
    ? images.length + (hasMore ? '+' : '')
    : batch?.generations.reduce((acc, g) => acc + (g.images?.length || 0), 0) || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {batch.name}
            <Badge className={getStatusColor(batch.status)}>
              {batch.status}
            </Badge>
          </h1>
          {batch.description && (
            <p className="text-muted-foreground">{batch.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {batch.status === 'draft' && (
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute Batch
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <span className="font-medium">
                {batch.provider === 'gemini' ? '⚡ Google Gemini' : '🎨 ComfyUI'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{new Date(batch.createdAt).toLocaleString()}</span>
            </div>
            {batch.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span>{new Date(batch.completedAt).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prompts:</span>
              <span>{batch.batchPrompts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Images per prompt:</span>
              <span>{batch.defaults?.count || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total generations:</span>
              <span>{batch.generations.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Successful:</span>
              <span className="text-green-600">
                {batch.generations.filter(g => g.status === 'success').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failed:</span>
              <span className="text-red-600">
                {batch.generations.filter(g => g.status === 'failed').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="text-gray-600">
                {batch.generations.filter(g => g.status === 'pending').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(batch.generations.length > 0 || images.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
            <CardDescription>
              {loadingImages && images.length === 0
                ? 'Loading images...'
                : `${totalImageCount} image(s) generated`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingImages && images.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No images generated yet
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {images.map((image, index) => (
                    <Card
                      key={image.id}
                      className="overflow-hidden group"
                      ref={index === images.length - 1 ? lastImageElementRef : null}
                    >
                      <div className="aspect-square bg-muted relative">
                        <img
                          src={`/api/images/${image.id}/file`}
                          alt={image.fileName}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedImageIndex(index)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        
                        {/* Favorite toggle on card */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`absolute top-2 right-2 z-10 rounded-full bg-black/20 hover:bg-black/40 ${image.isFavorite ? 'text-red-500' : 'text-white'}`}
                          onClick={(e) => toggleFavorite(e, image)}
                        >
                          <Heart className={`h-5 w-5 ${image.isFavorite ? 'fill-current' : ''}`} />
                        </Button>

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
                    </Card>
                  ))}
                </div>

                {fetchingMore && (
                  <div className="flex justify-center py-4 mt-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>
            {batch.batchPrompts.length} prompt(s) in this batch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batch.batchPrompts.map((prompt, index) => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle className="text-base">Prompt {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{prompt.promptText}</p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

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
                  src={`/api/images/${images[selectedImageIndex].id}/file`}
                  alt={images[selectedImageIndex].fileName}
                  className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200"
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
                  >
                    <Heart className={`h-8 w-8 ${images[selectedImageIndex].isFavorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40"
                    asChild
                  >
                    <a href={`/api/images/${images[selectedImageIndex].id}/file`} download={images[selectedImageIndex].fileName}>
                      <Download className="h-8 w-8" />
                    </a>
                  </Button>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-4 left-4 right-4 text-white text-xs bg-black/50 p-2 rounded backdrop-blur-sm opacity-0 group-hover/modal:opacity-100 transition-opacity pointer-events-none">
                  <p>Image {selectedImageIndex + 1} of {images.length}</p>
                  <p>Batch: {batch?.name}</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
