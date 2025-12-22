"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { 
  Loader2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Sparkles, 
  Layers,
  Pipette,
  Copy,
  Check,
  Film,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GalleryImage {
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
    batchPrompt: {
      id: string;
      promptText: string;
    } | null;
  };
}

interface ImageGalleryModalProps {
  images: GalleryImage[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite: (e: React.MouseEvent, image: GalleryImage) => Promise<void>;
  onMakeTransparent: (
    e: React.MouseEvent | React.KeyboardEvent, 
    image: GalleryImage, 
    samplePoint?: { x: number, y: number },
    forceOriginal?: boolean
  ) => Promise<void>;
  onToggleTransparencyView: (e: React.MouseEvent, imageId: string) => void;
  showTransparent: Record<string, boolean>;
  processingTransparency: Record<string, boolean>;
  transparencyTolerance: Record<string, number>;
  onToleranceChange: (imageId: string, tolerance: number) => void;
  transparencyMode: Record<string, 'global' | 'flood'>;
  onModeChange: (imageId: string, mode: 'global' | 'flood') => void;
  imageVersions: Record<string, number>;
  // Squish animation props
  processingSquish: Record<string, boolean>;
  squishIntensity: Record<string, number>;
  squishFrameCount: Record<string, number>;
  squishAnimationType: Record<string, 'bounce' | 'squash_stretch'>;
  squishAnimations: Record<string, any[]>;
  loadingSquishAnimations: Record<string, boolean>;
  onSquishIntensityChange: (imageId: string, intensity: number) => void;
  onSquishFrameCountChange: (imageId: string, count: number) => void;
  onSquishAnimationTypeChange: (imageId: string, type: 'bounce' | 'squash_stretch') => void;
  onGenerateSquish: (e: React.MouseEvent | React.KeyboardEvent, image: GalleryImage) => Promise<void>;
  onFetchSquishAnimations: (imageId: string) => Promise<void>;
  onDeleteSquishAnimation: (imageId: string, animationId: string) => Promise<void>;
  selectedVersion: Record<string, string>;
  onSelectedVersionChange: (imageId: string, version: string) => void;
  // AI animation props
  processingAI: Record<string, boolean>;
  suggestingPrompt: Record<string, boolean>;
  aiPrompt: Record<string, string>;
  aiGridSize: Record<string, 2 | 3 | 4>;
  aiAnimations: Record<string, any[]>;
  loadingAIAnimations: Record<string, boolean>;
  onAIPromptChange: (imageId: string, prompt: string) => void;
  onAIGridSizeChange: (imageId: string, size: 2 | 3 | 4) => void;
  onSuggestAnimation: (e: React.MouseEvent | React.KeyboardEvent, image: GalleryImage) => Promise<void>;
  onGenerateAIAnimation: (e: React.MouseEvent | React.KeyboardEvent, image: GalleryImage) => Promise<void>;
  onFetchAIAnimations: (imageId: string) => Promise<void>;
  onDeleteAIAnimation: (imageId: string, animationId: string) => Promise<void>;
}

export function ImageGalleryModal({
  images,
  selectedIndex,
  onClose,
  onNavigate,
  onToggleFavorite,
  onMakeTransparent,
  onToggleTransparencyView,
  showTransparent,
  processingTransparency,
  transparencyTolerance,
  onToleranceChange,
  transparencyMode,
  onModeChange,
  imageVersions,
  processingSquish,
  squishIntensity,
  squishFrameCount,
  squishAnimationType,
  squishAnimations,
  loadingSquishAnimations,
  onSquishIntensityChange,
  onSquishFrameCountChange,
  onSquishAnimationTypeChange,
  onGenerateSquish,
  onFetchSquishAnimations,
  onDeleteSquishAnimation,
  selectedVersion,
  onSelectedVersionChange,
  processingAI,
  suggestingPrompt,
  aiPrompt,
  aiGridSize,
  aiAnimations,
  loadingAIAnimations,
  onAIPromptChange,
  onAIGridSizeChange,
  onSuggestAnimation,
  onGenerateAIAnimation,
  onFetchAIAnimations,
  onDeleteAIAnimation,
}: ImageGalleryModalProps) {
  const lastScrollTime = useRef(0);
  const [isSampling, setIsSampling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalVersion, setInternalVersion] = useState<Record<string, number>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentImage = selectedIndex !== null ? images[selectedIndex] : null;

  const navigateImage = useCallback((direction: 'next' | 'prev') => {
    if (selectedIndex === null) return;
    
    if (direction === 'next' && selectedIndex < images.length - 1) {
      onNavigate(selectedIndex + 1);
    } else if (direction === 'prev' && selectedIndex > 0) {
      onNavigate(selectedIndex - 1);
    }
  }, [selectedIndex, images.length, onNavigate]);

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
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') navigateImage('next');
      if (e.key === 'ArrowLeft') navigateImage('prev');
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, navigateImage, onClose]);

  // Fetch animations when image changes
  useEffect(() => {
    if (currentImage && !squishAnimations[currentImage.id]) {
      onFetchSquishAnimations(currentImage.id);
    }
    if (currentImage && !aiAnimations[currentImage.id]) {
      onFetchAIAnimations(currentImage.id);
    }
  }, [currentImage?.id]);

  // Animation playback effect
  useEffect(() => {
    if (!currentImage) return;
    const version = selectedVersion[currentImage.id] || 'original';
    if (!version.startsWith('animation-')) return;

    const animationId = version.replace('animation-', '');
    const animation = squishAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
    if (!animation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `/api/squish-animations/${animationId}/file`;
    
    img.onload = () => {
      const frameCount = animation.frameCount;
      const frameWidth = animation.metadata?.frameWidth || img.width / frameCount;
      const frameHeight = animation.metadata?.frameHeight || img.height;

      canvas.width = frameWidth;
      canvas.height = frameHeight;

      let frame = 0;
      const fps = 12;
      const frameInterval = 1000 / fps;
      let lastFrameTime = 0;

      const animate = (timestamp: number) => {
        if (!isPlaying) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        if (timestamp - lastFrameTime >= frameInterval) {
          ctx.clearRect(0, 0, frameWidth, frameHeight);
          const sourceX = frame * frameWidth;
          ctx.drawImage(img, sourceX, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
          frame = (frame + 1) % frameCount;
          lastFrameTime = timestamp;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentImage?.id, selectedVersion, squishAnimations, isPlaying]);

  const handleCopyFileName = async () => {
    if (!currentImage) return;

    const version = selectedVersion[currentImage.id] || 'original';
    let pathToCopy = currentImage.filePath;

    if (version === 'transparent' && currentImage.transparentFilePath) {
      pathToCopy = currentImage.transparentFilePath;
    } else if (version.startsWith('animation-')) {
      const animationId = version.replace('animation-', '');
      const animation = squishAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
      if (animation) {
        pathToCopy = animation.spritesheetPath;
      }
    }

    // Extract filename from path
    const fileName = pathToCopy.split(/[\\/]/).pop() || pathToCopy;

    try {
      await navigator.clipboard.writeText(fileName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (currentImage && isSampling) {
      const rect = e.currentTarget.getBoundingClientRect();

      // Calculate position within the rendered image element
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // The image might be scaled via object-contain.
      // We need to find the actual image dimensions and its position within the box.
      const renderedWidth = rect.width;
      const renderedHeight = rect.height;
      const naturalWidth = e.currentTarget.naturalWidth;
      const naturalHeight = e.currentTarget.naturalHeight;

      const scale = Math.min(renderedWidth / naturalWidth, renderedHeight / naturalHeight);

      const actualRenderedWidth = naturalWidth * scale;
      const actualRenderedHeight = naturalHeight * scale;

      const offsetX = (renderedWidth - actualRenderedWidth) / 2;
      const offsetY = (renderedHeight - actualRenderedHeight) / 2;

      // Coordinates relative to the actual image pixels
      const imageX = Math.floor((x - offsetX) / scale);
      const imageY = Math.floor((y - offsetY) / scale);

      // Check if click is within image bounds
      if (imageX >= 0 && imageX < naturalWidth && imageY >= 0 && imageY < naturalHeight) {
        onMakeTransparent(e, currentImage, { x: imageX, y: imageY }, false).then(() => {
          setInternalVersion(prev => ({ ...prev, [currentImage.id]: Date.now() }));
        });
      }
    }
  };

  return (
    <Dialog 
      open={selectedIndex !== null} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        className="!max-w-none w-screen h-screen flex flex-col p-0 overflow-hidden bg-black/95 border-none [&>button]:text-white [&>button]:z-50 [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:scale-150 [&>button]:right-8 [&>button]:top-8"
        onWheel={handleWheel}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {currentImage ? currentImage.fileName : "Image Viewer"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 relative w-full h-full flex items-center justify-center group/modal overflow-hidden">
          {currentImage && (
            <>
              {/* Show canvas for animations, img for static versions */}
              {selectedVersion[currentImage.id]?.startsWith('animation-') ? (
                <canvas
                  ref={canvasRef}
                  className={`max-w-full max-h-full w-auto h-auto object-contain bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]`}
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <img
                  src={`/api/images/${currentImage.id}/file${selectedVersion[currentImage.id] === 'transparent' ? `?version=transparent&t=${internalVersion[currentImage.id] || imageVersions[currentImage.id] || ''}` : ''}`}
                  alt={currentImage.fileName}
                  className={`max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200 ${isSampling ? 'cursor-crosshair' : ''} ${selectedVersion[currentImage.id] === 'transparent' ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
                  onClick={handleImageClick}
                />
              )}
              
              {/* Navigation Arrows */}
              <div className="absolute inset-x-4 flex items-center justify-between pointer-events-none">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 pointer-events-auto disabled:opacity-0"
                  onClick={() => navigateImage('prev')}
                  disabled={selectedIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40 pointer-events-auto disabled:opacity-0"
                  onClick={() => navigateImage('next')}
                  disabled={selectedIndex === images.length - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>

              {/* Controls Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-4">
                {/* Version Selector */}
                <div className="w-64 pointer-events-auto">
                  <Select
                    value={selectedVersion[currentImage.id] || 'original'}
                    onValueChange={(value) => {
                      onSelectedVersionChange(currentImage.id, value);
                      if (value === 'transparent') {
                        onToggleTransparencyView({} as React.MouseEvent, currentImage.id);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-white hover:bg-black/50">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">Original</SelectItem>
                      {currentImage.transparentFilePath && (
                        <SelectItem value="transparent">Transparent</SelectItem>
                      )}
                      {squishAnimations[currentImage.id]?.map((animation: any) => (
                        <SelectItem key={animation.id} value={`animation-${animation.id}`}>
                          Animation - {animation.frameCount}f @ {animation.intensity}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${currentImage.isFavorite ? 'text-red-500' : 'text-white'}`}
                    onClick={(e) => onToggleFavorite(e, currentImage)}
                    title="Favorite"
                  >
                    <Heart className={`h-8 w-8 ${currentImage.isFavorite ? 'fill-current' : ''}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white ${processingTransparency[currentImage.id] ? 'animate-pulse' : ''}`}
                    onClick={(e) => onMakeTransparent(e, currentImage, undefined, true).then(() => {
                      setInternalVersion(prev => ({ ...prev, [currentImage.id]: Date.now() }));
                    })}
                    disabled={processingTransparency[currentImage.id]}
                    title={currentImage.transparentFilePath ? "Redo from Original (Corners)" : "Make Transparent (Corners)"}
                  >
                    {processingTransparency[currentImage.id] ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <Sparkles className="h-8 w-8" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${isSampling ? 'text-blue-400 bg-black/40' : 'text-white'}`}
                    onClick={() => setIsSampling(!isSampling)}
                    title="Toggle Color Picker"
                  >
                    <Pipette className="h-8 w-8" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${copied ? 'text-green-500' : 'text-white'}`}
                    onClick={handleCopyFileName}
                    title="Copy Filename"
                  >
                    {copied ? (
                      <Check className="h-8 w-8" />
                    ) : (
                      <Copy className="h-8 w-8" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40"
                    asChild
                  >
                    <a 
                      href={
                        selectedVersion[currentImage.id]?.startsWith('animation-')
                          ? `/api/squish-animations/${selectedVersion[currentImage.id].replace('animation-', '')}/file`
                          : `/api/images/${currentImage.id}/file${selectedVersion[currentImage.id] === 'transparent' ? '?version=transparent' : ''}`
                      } 
                      download={currentImage.fileName}
                      title="Download"
                    >
                      <Download className="h-8 w-8" />
                    </a>
                  </Button>
                </div>

                {/* Transparency controls */}
                <div className="w-64 space-y-4 pointer-events-auto bg-black/40 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="transparency-mode" className="text-white text-xs cursor-pointer">
                      {transparencyMode[currentImage.id] === 'flood' ? 'Flood-fill' : 'Global'} Mode
                    </Label>
                    <Switch
                      id="transparency-mode"
                      checked={transparencyMode[currentImage.id] === 'flood'}
                      onCheckedChange={(checked) => onModeChange(currentImage.id, checked ? 'flood' : 'global')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="tolerance-slider" className="text-white text-xs">Tolerance: {transparencyTolerance[currentImage.id] ?? 30}</Label>
                    </div>
                    <Slider
                      id="tolerance-slider"
                      min={0}
                      max={255}
                      step={1}
                      value={[transparencyTolerance[currentImage.id] ?? 30]}
                      onValueChange={(vals) => onToleranceChange(currentImage.id, vals[0])}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Squish Animation Controls */}
                <div className="w-64 space-y-3 pointer-events-auto bg-black/40 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-sm font-medium flex items-center gap-1">
                      <Film className="h-4 w-4" />
                      Squish Animation
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-white hover:bg-white/10"
                      onClick={() => onFetchSquishAnimations(currentImage.id)}
                      disabled={loadingSquishAnimations[currentImage.id]}
                    >
                      {loadingSquishAnimations[currentImage.id] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-white text-xs">Intensity: {squishIntensity[currentImage.id] ?? 20}%</Label>
                      <Slider
                        min={5}
                        max={50}
                        step={5}
                        value={[squishIntensity[currentImage.id] ?? 20]}
                        onValueChange={(vals) => onSquishIntensityChange(currentImage.id, vals[0])}
                        className="mt-2"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white text-xs">Frames:</Label>
                      <div className="flex gap-2">
                        {[4, 8, 12, 16].map(count => (
                          <Button
                            key={count}
                            size="sm"
                            variant={(squishFrameCount[currentImage.id] ?? 8) === count ? "default" : "outline"}
                            className="h-8 flex-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSquishFrameCountChange(currentImage.id, count);
                            }}
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={(e) => onGenerateSquish(e, currentImage)}
                      disabled={processingSquish[currentImage.id]}
                    >
                      {processingSquish[currentImage.id] ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Film className="h-3 w-3 mr-1" />
                          Generate Squish
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* List of existing animations */}
                  {squishAnimations[currentImage.id] && squishAnimations[currentImage.id].length > 0 && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/10">
                      <Label className="text-white text-xs">Animations ({squishAnimations[currentImage.id].length}):</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {squishAnimations[currentImage.id].map((animation: any) => (
                          <div key={animation.id} className="flex items-center gap-2 text-xs bg-black/30 p-2 rounded">
                            <a
                              href={`/api/squish-animations/${animation.id}/file`}
                              download
                              className="flex-1 hover:underline truncate text-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {animation.frameCount}f @ {animation.intensity}%
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSquishAnimation(currentImage.id, animation.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Animation Controls */}
                <div className="w-64 space-y-3 pointer-events-auto bg-black/40 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-sm font-medium flex items-center gap-1">
                      <Sparkles className="h-4 w-4" />
                      AI Animation
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-white hover:bg-white/10"
                      onClick={() => onFetchAIAnimations(currentImage.id)}
                      disabled={loadingAIAnimations[currentImage.id]}
                    >
                      {loadingAIAnimations[currentImage.id] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      onClick={(e) => onSuggestAnimation(e, currentImage)}
                      disabled={suggestingPrompt[currentImage.id]}
                    >
                      {suggestingPrompt[currentImage.id] ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Suggesting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Suggest Animation
                        </>
                      )}
                    </Button>

                    <div>
                      <Label className="text-white text-xs">Animation Description:</Label>
                      <Textarea
                        className="mt-1 text-xs min-h-[60px] bg-black/30 border-white/20 text-white"
                        placeholder="Describe the animation (e.g., 'walks forward with bouncy steps')"
                        value={aiPrompt[currentImage.id] || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          onAIPromptChange(currentImage.id, e.target.value);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white text-xs">Grid Size (frames):</Label>
                      <div className="flex gap-2">
                        {[2, 3, 4].map(size => {
                          const frameCount = size * size;
                          return (
                            <Button
                              key={size}
                              size="sm"
                              variant={(aiGridSize[currentImage.id] ?? 2) === size ? "default" : "outline"}
                              className="h-8 flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAIGridSizeChange(currentImage.id, size as 2 | 3 | 4);
                              }}
                            >
                              {size}×{size}
                              <span className="ml-1 text-[10px] opacity-70">({frameCount}f)</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={(e) => onGenerateAIAnimation(e, currentImage)}
                      disabled={processingAI[currentImage.id] || !aiPrompt[currentImage.id]?.trim()}
                    >
                      {processingAI[currentImage.id] ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate AI Animation
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* List of existing AI animations */}
                  {aiAnimations[currentImage.id] && aiAnimations[currentImage.id].length > 0 && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/10">
                      <Label className="text-white text-xs">AI Animations ({aiAnimations[currentImage.id].length}):</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {aiAnimations[currentImage.id].map((animation: any) => (
                          <div key={animation.id} className="flex items-center gap-2 text-xs bg-black/30 p-2 rounded">
                            <a
                              href={`/api/squish-animations/${animation.id}/file`}
                              download
                              className="flex-1 hover:underline truncate text-white"
                              onClick={(e) => e.stopPropagation()}
                              title={animation.aiPrompt}
                            >
                              {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2} - {animation.aiPrompt?.substring(0, 20)}...
                            </a>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAIAnimation(currentImage.id, animation.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs bg-black/50 p-4 rounded backdrop-blur-sm opacity-0 group-hover/modal:opacity-100 transition-opacity flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-300">
                    <p>Image {(selectedIndex ?? 0) + 1} of {images.length}</p>
                    {currentImage.generation.batch && (
                      <p>Batch: <span className="text-white">{currentImage.generation.batch?.name}</span></p>
                    )}
                  </div>
                  {currentImage.generation.batchPrompt?.promptText && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-medium">Prompt:</p>
                      <p className="text-white italic bg-black/30 p-2 rounded border border-white/5 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {currentImage.generation.batchPrompt.promptText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
