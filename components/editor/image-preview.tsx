"use client";

import { AnimationCanvas } from "@/components/shared/animation-canvas";
import Image from "next/image";

interface ImagePreviewProps {
  imageId: string;
  fileName: string;
  selectedVersion: string;
  imageVersion: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  squishAnimations: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiAnimations: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageEdits?: any[];
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
  imageEdits = [],
  isSampling = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasTransparent: _hasTransparent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onVersionChange: _onVersionChange,
  onImageClick,
}: ImagePreviewProps) {
  // Determine if we're viewing an animation or edit
  const isAnimation = selectedVersion.startsWith('squish-') || selectedVersion.startsWith('ai-');
  const isTransparentEdit = selectedVersion.startsWith('edit-transparent-');
  const isEdit = selectedVersion.startsWith('edit-');

  let currentAnimation = null;
  if (isAnimation) {
    if (selectedVersion.startsWith('squish-')) {
      const animationId = selectedVersion.replace('squish-', '');
      currentAnimation = squishAnimations?.find((a) => a.id === animationId);
    } else if (selectedVersion.startsWith('ai-')) {
      const animationId = selectedVersion.replace('ai-', '');
      currentAnimation = aiAnimations?.find((a) => a.id === animationId);
    }
  }

  // Get edit ID for both transparent and regular edits
  let editId: string | null = null;
  if (isTransparentEdit) {
    editId = selectedVersion.replace('edit-transparent-', '');
  } else if (isEdit) {
    editId = selectedVersion.replace('edit-', '');
  }

  const currentEdit = editId ? imageEdits?.find((e) => e.id === editId) : null;

  // Use imageVersion prop for cache busting - parent component manages this
  // Fallback to 0 if not provided (static cache)
  const cacheBuster = imageVersion || 0;

  return (
    <div className="h-full w-full flex flex-col p-8 bg-muted/5">
      {/* Image/Animation Display */}
      <div className="flex-1 flex items-center justify-center relative min-h-0">
        <div className="w-full h-full relative">
          {isAnimation && currentAnimation ? (
            <AnimationCanvas
              animation={currentAnimation}
              isPlaying={true}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
            />
          ) : (
            <Image
              src={
                isTransparentEdit && currentEdit?.transparentEditPath
                  ? `/api/image-edits/${editId}/file?version=transparent&t=${cacheBuster}`
                  : isEdit
                    ? `/api/image-edits/${editId}/file?t=${cacheBuster}`
                    : `/api/images/${imageId}/file?${selectedVersion === 'transparent'
                      ? `version=transparent&t=${cacheBuster}`
                      : selectedVersion === 'flipped'
                        ? `version=flipped&t=${cacheBuster}`
                        : `t=${cacheBuster}`
                    }`
              }
              alt={fileName}
              fill
              className={`object-contain ${isSampling ? 'cursor-crosshair' : ''} ${selectedVersion === 'transparent' || selectedVersion === 'flipped' || isEdit || isTransparentEdit
                ? 'bg-[url("https://www.transparenttextures.com/patterns/checkerboard.png")]'
                : ''
                }`}
              onClick={onImageClick}
              sizes="100vw"
              priority
            />
          )}
        </div>
      </div>
    </div>
  );
}
