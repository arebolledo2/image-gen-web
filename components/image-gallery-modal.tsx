"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Heart,
  Edit
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  onOpenEditor: (imageId: string) => void;
  // Version viewing (read-only)
  selectedVersion: Record<string, string>;
  onSelectedVersionChange: (imageId: string, version: string) => void;
  squishAnimations: Record<string, any[]>;
  aiAnimations: Record<string, any[]>;
}

export function ImageGalleryModal({
  images,
  selectedIndex,
  onClose,
  onNavigate,
  onToggleFavorite,
  onOpenEditor,
  selectedVersion,
  onSelectedVersionChange,
  squishAnimations,
  aiAnimations,
}: ImageGalleryModalProps) {
  const lastScrollTime = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
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

  // Animation playback effect
  useEffect(() => {
    if (!currentImage) return;
    const version = selectedVersion[currentImage.id] || 'original';
    if (!version.startsWith('animation-')) return;

    const animationId = version.replace('animation-', '');
    // Check both squish and AI animations
    const squishAnimation = squishAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
    const aiAnimation = aiAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
    const animation = squishAnimation || aiAnimation;
    if (!animation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `/api/squish-animations/${animationId}/file`;
    
    img.onload = () => {
      const frameCount = animation.frameCount;
      const gridSize = animation.metadata?.gridSize; // AI animations have gridSize (2, 3, or 4)
      
      console.log('Animation Debug:', {
        frameCount,
        gridSize,
        frameWidth: animation.metadata?.frameWidth,
        frameHeight: animation.metadata?.frameHeight,
        totalWidth: animation.metadata?.width,
        totalHeight: animation.metadata?.height,
        imageWidth: img.width,
        imageHeight: img.height,
      });
      
      let frameWidth: number;
      let frameHeight: number;
      
      if (gridSize) {
        // AI animation: use stored frame dimensions from metadata
        frameWidth = animation.metadata?.frameWidth || img.width / gridSize;
        frameHeight = animation.metadata?.frameHeight || img.height / gridSize;
      } else {
        // Squish animation: horizontal row layout
        frameWidth = animation.metadata?.frameWidth || img.width / frameCount;
        frameHeight = animation.metadata?.frameHeight || img.height;
      }

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
          
          let sourceX: number;
          let sourceY: number;
          
          if (gridSize) {
            // AI animation: calculate grid position (left-to-right, top-to-bottom)
            const col = frame % gridSize;
            const row = Math.floor(frame / gridSize);
            sourceX = col * frameWidth;
            sourceY = row * frameHeight;
          } else {
            // Squish animation: horizontal row
            sourceX = frame * frameWidth;
            sourceY = 0;
          }
          
          ctx.drawImage(img, sourceX, sourceY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
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
  }, [currentImage?.id, selectedVersion, squishAnimations, aiAnimations, isPlaying]);

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
                  src={`/api/images/${currentImage.id}/file${selectedVersion[currentImage.id] === 'transparent' ? '?version=transparent' : ''}`}
                  alt={currentImage.fileName}
                  className={`max-w-full max-h-full w-auto h-auto object-contain ${selectedVersion[currentImage.id] === 'transparent' ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
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
                    onValueChange={(value) => onSelectedVersionChange(currentImage.id, value)}
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
                          Squish - {animation.frameCount}f @ {animation.intensity}%
                        </SelectItem>
                      ))}
                      {aiAnimations[currentImage.id]?.map((animation: any) => (
                        <SelectItem key={animation.id} value={`animation-${animation.id}`}>
                          AI - {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2} ({animation.frameCount}f)
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
                    className="h-12 w-12 rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={() => onOpenEditor(currentImage.id)}
                    title="Open in Editor"
                  >
                    <Edit className="h-8 w-8" />
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

                {/* Removed transparency and animation controls - now available in editor page */}
              </div>

              {/* Info Overlay - positioned to avoid left controls */}
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs bg-black/50 p-4 rounded backdrop-blur-sm opacity-0 group-hover/modal:opacity-100 transition-opacity flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-300">
                    <p>Image {(selectedIndex ?? 0) + 1} of {images.length}</p>
                    {currentImage.generation.batch && (
                      <p>Batch: <span className="text-white">{currentImage.generation.batch?.name}</span></p>
                    )}
                    {selectedVersion[currentImage.id]?.startsWith('animation-') && (
                      <p className="text-blue-400 font-medium">Viewing Animation</p>
                    )}
                  </div>

                  {/* Original Image Prompt */}
                  {currentImage.generation.batchPrompt?.promptText && (
                    <div className="space-y-1">
                      <p className="text-gray-400 font-medium">Prompt:</p>
                      <p className="text-white italic bg-black/30 p-2 rounded border border-white/5 max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed">
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
