"use client";

import { useState } from "react";
import { AnimationCanvas } from "@/components/shared/animation-canvas";

interface ImagePreviewProps {
  imageId: string;
  fileName: string;
  selectedVersion: string;
  imageVersion: number;
  squishAnimations: any[];
  aiAnimations: any[];
  isSampling?: boolean;
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
  onImageClick,
}: ImagePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  // Determine if we're viewing an animation
  const isAnimation = selectedVersion.startsWith('animation-');

  let currentAnimation = null;
  if (isAnimation) {
    const animationId = selectedVersion.replace('animation-', '');
    currentAnimation = squishAnimations?.find((a: any) => a.id === animationId) ||
                      aiAnimations?.find((a: any) => a.id === animationId);
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-muted/5">
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

      {/* Animation controls overlay (if needed in future) */}
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
  );
}
