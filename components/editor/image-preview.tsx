"use client";

import { AnimationCanvas } from "@/components/shared/animation-canvas";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

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
  // Color preview state for sampling mode
  const [previewColor, setPreviewColor] = useState<{ r: number; g: number; b: number; a: number } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Build the image URL for the current version
  const imageUrl = isTransparentEdit && currentEdit?.transparentEditPath
    ? `/api/image-edits/${editId}/file?version=transparent&t=${cacheBuster}`
    : isEdit
      ? `/api/image-edits/${editId}/file?t=${cacheBuster}`
      : `/api/images/${imageId}/file?${selectedVersion === 'transparent'
        ? `version=transparent&t=${cacheBuster}`
        : selectedVersion === 'flipped'
          ? `version=flipped&t=${cacheBuster}`
          : `t=${cacheBuster}`
      }`;

  // Reset preview state when sampling mode is disabled
  useEffect(() => {
    if (!isSampling) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPreviewColor(null);
      setCursorPosition(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isSampling]);

  // Load image into canvas for color sampling
  useEffect(() => {
    if (!isSampling) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      imageRef.current = img;
    };
    img.src = imageUrl;
  }, [isSampling, imageUrl]);

  // Handle mouse move to sample color
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSampling || !canvasRef.current || !imageRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const canvas = canvasRef.current;
    const img = imageRef.current;

    // Find the actual image element within the container
    const imgElement = container.querySelector('img');
    if (!imgElement) return;

    const imgRect = imgElement.getBoundingClientRect();

    // Get click position relative to the image element's bounding box
    const x = e.clientX - imgRect.left;
    const y = e.clientY - imgRect.top;

    // The image uses object-contain, so we need to calculate the actual rendered size
    // and offset within the bounding box (same logic as handleImageClick)
    const renderedWidth = imgRect.width;
    const renderedHeight = imgRect.height;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calculate the scale factor that object-contain uses
    const scale = Math.min(renderedWidth / naturalWidth, renderedHeight / naturalHeight);

    // Calculate actual rendered dimensions
    const actualRenderedWidth = naturalWidth * scale;
    const actualRenderedHeight = naturalHeight * scale;

    // Calculate centering offset within the bounding box
    const offsetX = (renderedWidth - actualRenderedWidth) / 2;
    const offsetY = (renderedHeight - actualRenderedHeight) / 2;

    // Convert to image coordinates accounting for offset and scale
    const imageX = Math.floor((x - offsetX) / scale);
    const imageY = Math.floor((y - offsetY) / scale);

    // Check if within bounds
    if (imageX >= 0 && imageX < canvas.width && imageY >= 0 && imageY < canvas.height) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const pixel = ctx.getImageData(imageX, imageY, 1, 1).data;
        setPreviewColor({ r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
        setCursorPosition({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
      }
    } else {
      setPreviewColor(null);
    }
  }, [isSampling]);


  const handleMouseLeave = useCallback(() => {
    setPreviewColor(null);
    setCursorPosition(null);
  }, []);

  return (
    <div className="h-full w-full flex flex-col p-8 bg-muted/5">
      {/* Hidden canvas for color sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Image/Animation Display */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center relative min-h-0"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Color Preview Tooltip */}
        {isSampling && previewColor && cursorPosition && (
          <div
            className="pointer-events-none absolute z-50 flex items-center gap-2 rounded-md bg-popover/95 px-2 py-1.5 text-xs shadow-md border backdrop-blur-sm"
            style={{
              left: cursorPosition.x + 16,
              top: cursorPosition.y - 12,
            }}
          >
            <div
              className="w-5 h-5 rounded border border-border shadow-inner"
              style={{
                backgroundColor: `rgba(${previewColor.r}, ${previewColor.g}, ${previewColor.b}, ${previewColor.a / 255})`,
              }}
            />
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] text-muted-foreground">
                RGB({previewColor.r}, {previewColor.g}, {previewColor.b})
              </span>
              {previewColor.a < 255 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  α: {Math.round((previewColor.a / 255) * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        <div className="w-full h-full relative">
          {isAnimation && currentAnimation ? (
            <AnimationCanvas
              animation={currentAnimation}
              isPlaying={true}
              className="max-w-full max-h-full w-auto h-auto object-contain bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]"
            />
          ) : (
            <Image
              src={imageUrl}
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
