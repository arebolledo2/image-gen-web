"use client";

import { useEffect, useRef } from "react";

interface AnimationCanvasProps {
  animation: {
    id: string;
    frameCount: number;
    metadata?: {
      gridSize?: number;
      frameWidth?: number;
      frameHeight?: number;
      width?: number;
      height?: number;
    };
  };
  isPlaying?: boolean;
  className?: string;
  onFrameChange?: (frame: number) => void;
}

export function AnimationCanvas({
  animation,
  isPlaying = true,
  className = "",
  onFrameChange,
}: AnimationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animation || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `/api/squish-animations/${animation.id}/file`;

    img.onload = () => {
      const frameCount = animation.frameCount;
      const gridSize = animation.metadata?.gridSize; // AI animations have gridSize (2, 3, or 4)

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

          if (onFrameChange) {
            onFrameChange(frame);
          }

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
  }, [animation?.id, isPlaying, onFrameChange]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
