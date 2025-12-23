"use client";

import { useState } from "react";
import { AnimationCanvas } from "@/components/shared/animation-canvas";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  imageId: string;
  fileName: string;
  selectedVersion: string;
  imageVersion: number;
  squishAnimations: any[];
  aiAnimations: any[];
  isSampling?: boolean;
  hasTransparent?: boolean;
  onVersionChange?: (version: string) => void;
  onImageClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export function ImagePreview({
  imageId,
  fileName,
  selectedVersion,
  imageVersion,
  squishAnimations,
  aiAnimations,
  isSampling = false,
  hasTransparent = false,
  onVersionChange,
  onImageClick,
}: ImagePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  // Determine if we're viewing an animation
  const isAnimation = selectedVersion.startsWith('squish-') || selectedVersion.startsWith('ai-');

  let currentAnimation = null;
  if (isAnimation) {
    if (selectedVersion.startsWith('squish-')) {
      const animationId = selectedVersion.replace('squish-', '');
      currentAnimation = squishAnimations?.find((a: any) => a.id === animationId);
    } else if (selectedVersion.startsWith('ai-')) {
      const animationId = selectedVersion.replace('ai-', '');
      currentAnimation = aiAnimations?.find((a: any) => a.id === animationId);
    }
  }

  return (
    <div className="h-full w-full flex flex-col gap-4 p-8 bg-muted/5">
      {/* Version Selector Buttons */}
      {onVersionChange && (
        <div className="flex flex-wrap gap-2">
          {/* Original Version */}
          <Button
            variant={selectedVersion === 'original' ? 'default' : 'outline'}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => onVersionChange('original')}
          >
            Original
          </Button>

          {/* Transparent Version */}
          {hasTransparent && (
            <Button
              variant={selectedVersion === 'transparent' ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onVersionChange('transparent')}
            >
              Transparent
            </Button>
          )}

          {/* Squish Animations */}
          {squishAnimations?.map((animation: any) => (
            <Button
              key={animation.id}
              variant={selectedVersion === `squish-${animation.id}` ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onVersionChange(`squish-${animation.id}`)}
            >
              Squish {animation.frameCount}f @{animation.intensity}%
            </Button>
          ))}

          {/* AI Animations */}
          {aiAnimations?.map((animation: any) => (
            <Button
              key={animation.id}
              variant={selectedVersion === `ai-${animation.id}` ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onVersionChange(`ai-${animation.id}`)}
              title={animation.aiPrompt}
            >
              AI {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2}
            </Button>
          ))}
        </div>
      )}

      {/* Image/Animation Display */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="max-w-full max-h-full flex items-center justify-center">
          {isAnimation && currentAnimation ? (
            <AnimationCanvas
              animation={currentAnimation}
              isPlaying={isPlaying}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
            />
          ) : (
            <img
              src={`/api/images/${imageId}/file${selectedVersion === 'transparent' ? `?version=transparent&t=${imageVersion || ''}` : ''}`}
              alt={fileName}
              className={`max-w-full max-h-full w-auto h-auto object-contain ${isSampling ? 'cursor-crosshair' : ''} ${selectedVersion === 'transparent' ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]' : ''}`}
              onClick={onImageClick}
            />
          )}
        </div>

        {/* Animation controls overlay */}
        {isAnimation && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-xs font-medium"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
