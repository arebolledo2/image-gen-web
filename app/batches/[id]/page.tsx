"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Trash2, ArrowLeft, Download, Heart, Sparkles, Layers, Copy, ChevronRight, Edit2, Check, X } from "lucide-react";
import { ImageGalleryModal, type GalleryImage } from "@/components/image-gallery-modal";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Batch {
  id: string;
  name: string;
  version: number;
  description: string | null;
  status: string;
  provider: 'gemini' | 'comfyui';
  createdAt: string;
  completedAt: string | null;
  defaults: any;
  batchPrompts: any[];
  generations: any[];
  parentBatch?: { id: string; name: string } | null;
  childBatches?: { id: string; name: string; version: number }[];
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);

  // Prompt editing state
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Image gallery state
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageOffset, setImageOffset] = useState(0);
  const IMAGES_LIMIT = 20;

  // Transparency toggle state (image id -> boolean)
  const [globalTransparency, setGlobalTransparency] = useState(false);
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});
  const [processingTransparency, setProcessingTransparency] = useState<Record<string, boolean>>({});
  const [transparencyTolerance, setTransparencyTolerance] = useState<Record<string, number>>({});
  const [transparencyMode, setTransparencyMode] = useState<Record<string, 'global' | 'flood'>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  // Modal state
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
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

  const handleCreateVersion = async () => {
    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/batches/${params.id}/version`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create version");
      }

      const data = await response.json();
      router.push(`/batches/${data.batch.id}`);
    } catch (error) {
      console.error("Error creating version:", error);
      alert("Failed to create version");
    } finally {
      setCreatingVersion(false);
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
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      setImages(prev => prev.map(img => img.id === image.id ? { ...img, isFavorite: !newStatus } : img));
    }
  };

  const makeTransparent = async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage,
    samplePoint?: { x: number, y: number },
    forceOriginal?: boolean
  ) => {
    console.log('🚨🚨🚨 makeTransparent CALLED!');
    console.log('🎯 samplePoint:', samplePoint);
    console.log('🔧 forceOriginal:', forceOriginal);
    console.log('📊 image.id:', image.id);

    e.stopPropagation();
    if (processingTransparency[image.id]) {
      console.log('Already processing, returning early');
      return;
    }

    const tolerance = transparencyTolerance[image.id] ?? 30;
    const mode = transparencyMode[image.id] ?? 'global';

    console.log('makeTransparent called with:', {
      imageId: image.id,
      samplePoint,
      forceOriginal,
      tolerance,
      mode
    });

    setProcessingTransparency(prev => ({ ...prev, [image.id]: true }));

    try {
      const bodyData = { tolerance, mode, samplePoint, forceOriginal };
      console.log('Sending to API:', bodyData);

      const response = await fetch(`/api/images/${image.id}/transparent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error('Failed to make image transparent');
      }

      const data = await response.json();

      // Handle the case where user clicked on transparent pixel
      if (data.alreadyTransparent) {
        alert(data.message || 'The selected pixel is already transparent. Please click on a visible area.');
        return; // Early exit, don't update state
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to make image transparent');
      }

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

  const handleEditPrompt = (prompt: any) => {
    setEditingPromptId(prompt.id);
    setEditPromptText(prompt.promptText);
  };

  const handleSavePrompt = async (promptId: string) => {
    setSavingPrompt(true);
    try {
      const response = await fetch(`/api/batch-prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: editPromptText }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      // Refresh batch data to show updated prompt
      await fetchBatch();
      setEditingPromptId(null);
    } catch (error) {
      console.error('Error updating prompt:', error);
      alert('Failed to update prompt');
    } finally {
      setSavingPrompt(false);
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
            <Badge variant="outline">v{batch.version}</Badge>
            <Badge className={getStatusColor(batch.status)}>
              {batch.status}
            </Badge>
          </div>
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
          <Button onClick={handleCreateVersion} disabled={creatingVersion}>
            {creatingVersion ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Create Version
          </Button>
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
            <div className="flex items-center justify-between">
              <CardDescription>
                {loadingImages && images.length === 0
                  ? 'Loading images...'
                  : `${totalImageCount} image(s) generated`
                }
              </CardDescription>
              <div className="flex items-center space-x-2 bg-muted/50 p-2 px-4 rounded-lg">
                <Switch 
                  id="global-transparency" 
                  checked={globalTransparency}
                  onCheckedChange={toggleGlobalTransparency}
                />
                <Label htmlFor="global-transparency" className="cursor-pointer">Transparency</Label>
              </div>
            </div>
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

      {(batch.parentBatch || (batch.childBatches && batch.childBatches.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Lineage</CardTitle>
            <CardDescription>Related versions and parent batches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {batch.parentBatch && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Batch</h4>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/batches/${batch.parentBatch!.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {batch.parentBatch.name}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {batch.childBatches && batch.childBatches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Batches</h4>
                <div className="grid gap-2">
                  {batch.childBatches.map((child) => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => router.push(`/batches/${child.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        {child.name}
                        <Badge variant="secondary" className="text-[10px]">v{child.version}</Badge>
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Prompt {index + 1}</CardTitle>
                {batch.status === 'draft' && editingPromptId !== prompt.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPrompt(prompt)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingPromptId === prompt.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editPromptText}
                      onChange={(e) => setEditPromptText(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPromptId(null)}
                        disabled={savingPrompt}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePrompt(prompt.id)}
                        disabled={savingPrompt}
                      >
                        {savingPrompt ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{prompt.promptText}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

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
    </div>
  );
}
