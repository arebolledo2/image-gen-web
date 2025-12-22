"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface SquishAnimationPlayerProps {
  animationId: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  className?: string;
}

export function SquishAnimationPlayer({
  animationId,
  frameCount,
  frameWidth,
  frameHeight,
  className = "",
}: SquishAnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(12); // Frames per second
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Load sprite sheet image
  useEffect(() => {
    const img = new Image();
    img.src = `/api/squish-animations/${animationId}/file`;
    img.onload = () => {
      setImage(img);
    };
    img.onerror = () => {
      console.error('Failed to load sprite sheet');
    };
  }, [animationId]);

  // Animation loop
  useEffect(() => {
    if (!image || !canvasRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameInterval = 1000 / fps;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameInterval) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw current frame from sprite sheet
        const sourceX = currentFrame * frameWidth;
        ctx.drawImage(
          image,
          sourceX, 0, // Source position
          frameWidth, frameHeight, // Source dimensions
          0, 0, // Destination position
          canvas.width, canvas.height // Destination dimensions
        );

        // Move to next frame
        setCurrentFrame((prev) => (prev + 1) % frameCount);
        lastFrameTimeRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [image, isPlaying, currentFrame, frameCount, frameWidth, frameHeight, fps]);

  // Draw static frame when paused
  useEffect(() => {
    if (!image || !canvasRef.current || isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sourceX = currentFrame * frameWidth;
    ctx.drawImage(
      image,
      sourceX, 0,
      frameWidth, frameHeight,
      0, 0,
      canvas.width, canvas.height
    );
  }, [image, currentFrame, frameWidth, frameHeight, isPlaying]);

  return (
    <div className={`space-y-3 ${className}`}>
      <canvas
        ref={canvasRef}
        width={frameWidth}
        height={frameHeight}
        className="w-full h-auto bg-muted rounded-lg"
        style={{
          imageRendering: 'pixelated',
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/checkerboard.png")',
        }}
      />
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div className="flex-1">
            <Slider
              min={0}
              max={frameCount - 1}
              step={1}
              value={[currentFrame]}
              onValueChange={(vals) => {
                setIsPlaying(false);
                setCurrentFrame(vals[0]);
              }}
            />
          </div>
          
          <span className="text-xs text-muted-foreground min-w-[4ch] text-right">
            {currentFrame + 1}/{frameCount}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Speed:</Label>
          <Slider
            min={4}
            max={30}
            step={2}
            value={[fps]}
            onValueChange={(vals) => setFps(vals[0])}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground min-w-[4ch] text-right">
            {fps} FPS
          </span>
        </div>
      </div>
    </div>
  );
}
