"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Heart,
  Edit,
  HelpCircle,
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
  const [copied, setCopied] = useState(false);
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

  const handleCopyFileName = useCallback((image: GalleryImage) => {
    const version = selectedVersion[image.id] || 'original';
    let textToCopy = image.fileName;

    if (version === 'transparent' && image.transparentFilePath) {
      // Extract filename from path
      textToCopy = image.transparentFilePath.split('/').pop() || image.fileName;
    } else if (version.startsWith('squish-')) {
      const animationId = version.replace('squish-', '');
      const animation = squishAnimations[image.id]?.find((a: any) => a.id === animationId);
      const path = animation?.spritesheetPath || animation?.filePath;
      if (path) {
        textToCopy = path.split(/[/\\]/).pop() || textToCopy;
      }
    } else if (version.startsWith('ai-')) {
      const animationId = version.replace('ai-', '');
      const animation = aiAnimations[image.id]?.find((a: any) => a.id === animationId);
      const path = animation?.spritesheetPath || animation?.filePath;
      if (path) {
        textToCopy = path.split(/[/\\]/).pop() || textToCopy;
      }
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedVersion, squishAnimations, aiAnimations]);

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
    if (!version.startsWith('squish-') && !version.startsWith('ai-')) return;

    let animationId: string;
    let animation: any;

    if (version.startsWith('squish-')) {
      animationId = version.replace('squish-', '');
      animation = squishAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
    } else if (version.startsWith('ai-')) {
      animationId = version.replace('ai-', '');
      animation = aiAnimations[currentImage.id]?.find((a: any) => a.id === animationId);
    } else {
      return; // Invalid version format
    }

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
              {(selectedVersion[currentImage.id]?.startsWith('squish-') || selectedVersion[currentImage.id]?.startsWith('ai-')) ? (
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
                {/* Version Selector - Button Grid */}
                <div className="flex flex-col gap-2 pointer-events-auto max-w-xs">
                  <div className="flex flex-wrap gap-2">
                    {/* Original Version */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 px-3 text-xs rounded-lg ${
                        (selectedVersion[currentImage.id] || 'original') === 'original'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-black/40 text-white/70 hover:bg-black/50 hover:text-white'
                      }`}
                      onClick={() => onSelectedVersionChange(currentImage.id, 'original')}
                    >
                      Original
                    </Button>

                    {/* Transparent Version */}
                    {currentImage.transparentFilePath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-3 text-xs rounded-lg ${
                          selectedVersion[currentImage.id] === 'transparent'
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-black/40 text-white/70 hover:bg-black/50 hover:text-white'
                        }`}
                        onClick={() => onSelectedVersionChange(currentImage.id, 'transparent')}
                      >
                        Transparent
                      </Button>
                    )}

                    {/* Squish Animations */}
                    {squishAnimations[currentImage.id]?.map((animation: any) => (
                      <Button
                        key={`squish-${animation.id}`}
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-3 text-xs rounded-lg ${
                          selectedVersion[currentImage.id] === `squish-${animation.id}`
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-black/40 text-white/70 hover:bg-black/50 hover:text-white'
                        }`}
                        onClick={() => onSelectedVersionChange(currentImage.id, `squish-${animation.id}`)}
                      >
                        Squish {animation.frameCount}f @{animation.intensity}%
                      </Button>
                    ))}

                    {/* AI Animations */}
                    {aiAnimations[currentImage.id]?.map((animation: any) => (
                      <Button
                        key={`ai-${animation.id}`}
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-3 text-xs rounded-lg ${
                          selectedVersion[currentImage.id] === `ai-${animation.id}`
                            ? 'bg-white/20 text-white border border-white/30'
                            : 'bg-black/40 text-white/70 hover:bg-black/50 hover:text-white'
                        }`}
                        onClick={() => onSelectedVersionChange(currentImage.id, `ai-${animation.id}`)}
                        title={animation.aiPrompt}
                      >
                        AI {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2}
                      </Button>
                    ))}
                  </div>
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
                        selectedVersion[currentImage.id]?.startsWith('squish-')
                          ? `/api/squish-animations/${selectedVersion[currentImage.id].replace('squish-', '')}/file`
                          : selectedVersion[currentImage.id]?.startsWith('ai-')
                          ? `/api/squish-animations/${selectedVersion[currentImage.id].replace('ai-', '')}/file`
                          : `/api/images/${currentImage.id}/file${selectedVersion[currentImage.id] === 'transparent' ? '?version=transparent' : ''}`
                      }
                      download={currentImage.fileName}
                      title="Download"
                    >
                      <Download className="h-8 w-8" />
                    </a>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 transition-colors ${copied ? 'text-green-500' : 'text-white'}`}
                    onClick={() => handleCopyFileName(currentImage)}
                    title="Copy Filename"
                  >
                    {copied ? <Check className="h-8 w-8" /> : <Copy className="h-8 w-8" />}
                  </Button>
                </div>

                {/* Removed transparency and animation controls - now available in editor page */}
              </div>

              {/* Info Overlay - positioned to avoid left controls */}
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pointer-events-none">
                <div className="space-y-2 flex-1 min-w-0 flex flex-col items-start">
                  {/* Prompt with Help Icon Trigger */}
                  {currentImage.generation.batchPrompt?.promptText && (
                    <div className="group/prompt relative pointer-events-auto">
                      <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors cursor-help">
                        <HelpCircle className="h-5 w-5 text-white/70 group-hover/prompt:text-white" />
                      </div>
                      
                      {/* Tooltip-like prompt display */}
                      <div 
                        className="absolute bottom-full left-0 mb-0 w-80 md:w-96 opacity-0 group-hover/prompt:opacity-100 transition-opacity pointer-events-none group-hover/prompt:pointer-events-auto pb-4"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <div className="bg-black/90 p-4 rounded-lg border border-white/10 shadow-xl backdrop-blur-md">
                          <p className="text-gray-400 font-medium mb-2 border-b border-white/10 pb-1">Prompt</p>
                          <p className="text-white italic max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed text-sm scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                            {currentImage.generation.batchPrompt.promptText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-300 bg-black/50 p-2 px-3 rounded-full backdrop-blur-sm">
                    <p>Image {(selectedIndex ?? 0) + 1} of {images.length}</p>
                    {currentImage.generation.batch && (
                      <p>Batch: <span className="text-white">{currentImage.generation.batch?.name}</span></p>
                    )}
                    {(selectedVersion[currentImage.id]?.startsWith('squish-') || selectedVersion[currentImage.id]?.startsWith('ai-')) && (
                      <p className="text-blue-400 font-medium">Viewing Animation</p>
                    )}
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
