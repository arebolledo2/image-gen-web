"use client";

/**
 * Squish Animation Panel Component
 * Note: Uses `any` for dynamic animation data from API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Film, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SquishAnimationPanelProps {
  intensity: number;
  frameCount: number;
  processing: boolean;
  loading: boolean;
  animations: any[];
  onIntensityChange: (intensity: number) => void;
  onFrameCountChange: (count: number) => void;
  onGenerate: () => void;
  onRefresh: () => void;
  onDelete: (animationId: string) => void;
}

export function SquishAnimationPanel({
  intensity,
  frameCount,
  processing,
  loading,
  animations,
  onIntensityChange,
  onFrameCountChange,
  onGenerate,
  onRefresh,
  onDelete,
}: SquishAnimationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Film className="h-4 w-4" />
            Squish Animation
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Intensity Slider */}
        <div className="space-y-2">
          <Label className="text-xs">Intensity: {intensity}%</Label>
          <Slider
            min={5}
            max={50}
            step={5}
            value={[intensity]}
            onValueChange={(vals) => onIntensityChange(vals[0])}
            className="w-full"
          />
        </div>

        {/* Frame Count Buttons */}
        <div className="space-y-2">
          <Label className="text-xs">Frames:</Label>
          <div className="grid grid-cols-4 gap-2">
            {[4, 8, 12, 16].map(count => (
              <Button
                key={count}
                size="sm"
                variant={frameCount === count ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => onFrameCountChange(count)}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={onGenerate}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Film className="h-4 w-4 mr-2" />
              Generate Squish
            </>
          )}
        </Button>

        {/* Animation List */}
        {animations && animations.length > 0 && (
          <div className="mt-4 space-y-2 pt-4 border-t">
            <Label className="text-xs">Animations ({animations.length}):</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {animations.map((animation: any) => (
                <div key={animation.id} className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                  <a
                    href={`/api/squish-animations/${animation.id}/file`}
                    download
                    className="flex-1 hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {animation.frameCount}f @ {animation.intensity}%
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onDelete(animation.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
