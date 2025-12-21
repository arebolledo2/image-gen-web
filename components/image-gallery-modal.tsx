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
  Check
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
}: ImageGalleryModalProps) {
  const lastScrollTime = useRef(0);
  const [isSampling, setIsSampling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalVersion, setInternalVersion] = useState<Record<string, number>>({});

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

  const currentImage = selectedIndex !== null ? images[selectedIndex] : null;

  const handleCopyFileName = async () => {
    if (!currentImage) return;

    const isTransparent = showTransparent[currentImage.id];
    const pathToCopy = (isTransparent && currentImage.transparentFilePath) 
      ? currentImage.transparentFilePath 
      : currentImage.filePath;

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
              <img
                src={`/api/images/${currentImage.id}/file${showTransparent[currentImage.id] ? `?version=transparent&t=${internalVersion[currentImage.id] || imageVersions[currentImage.id] || ''}` : ''}`}
                alt={currentImage.fileName}
                className={`max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-200 ${isSampling ? 'cursor-crosshair' : ''} ${showTransparent[currentImage.id] ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
                onClick={handleImageClick}
              />
              
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

                  {currentImage.transparentFilePath ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 ${showTransparent[currentImage.id] ? 'text-blue-400' : 'text-white'}`}
                      onClick={(e) => onToggleTransparencyView(e, currentImage.id)}
                      title="Toggle Transparency"
                    >
                      <Layers className="h-8 w-8" />
                    </Button>
                  ) : null}

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
                      href={`/api/images/${currentImage.id}/file${showTransparent[currentImage.id] ? '?version=transparent' : ''}`} 
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
