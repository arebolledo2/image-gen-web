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
    <div className="h-full w-full flex flex-col p-8 bg-muted/5">
      {/* Image/Animation Display */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <div className="w-full h-full flex items-center justify-center">
          {isAnimation && currentAnimation ? (
            <AnimationCanvas
              animation={currentAnimation}
              isPlaying={true}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
            />
          ) : (
            <img
              src={`/api/images/${imageId}/file${
                selectedVersion === 'transparent'
                  ? `?version=transparent&t=${imageVersion || ''}`
                  : selectedVersion === 'flipped'
                  ? `?version=flipped&t=${imageVersion || ''}`
                  : ''
              }`}
              alt={fileName}
              className={`max-w-full max-h-full w-auto h-auto object-contain ${isSampling ? 'cursor-crosshair' : ''} ${
                selectedVersion === 'transparent' || selectedVersion === 'flipped'
                  ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]'
                  : ''
              }`}
              onClick={onImageClick}
            />
          )}
        </div>
      </div>
    </div>
  );
}
