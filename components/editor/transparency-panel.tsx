"use client";

import { Sparkles, Pipette, Loader2, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TransparencyPanelProps {
  mode: 'global' | 'flood';
  tolerance: number;
  processing: boolean;
  processingFlip: boolean;
  hasTransparent: boolean;
  hasFlipped: boolean;
  isSampling: boolean;
  onModeChange: (mode: 'global' | 'flood') => void;
  onToleranceChange: (tolerance: number) => void;
  onApplyCorners: () => void;
  onToggleSampling: () => void;
  onFlipHorizontal: () => void;
}

export function TransparencyPanel({
  mode,
  tolerance,
  processing,
  processingFlip,
  hasTransparent,
  hasFlipped,
  isSampling,
  onModeChange,
  onToleranceChange,
  onApplyCorners,
  onToggleSampling,
  onFlipHorizontal,
}: TransparencyPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Transparency
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="transparency-mode" className="text-xs cursor-pointer">
            {mode === 'flood' ? 'Flood-fill' : 'Global'} Mode
          </Label>
          <Switch
            id="transparency-mode"
            checked={mode === 'flood'}
            onCheckedChange={(checked) => onModeChange(checked ? 'flood' : 'global')}
          />
        </div>

        {/* Tolerance Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="tolerance-slider" className="text-xs">
              Tolerance: {tolerance}
            </Label>
          </div>
          <Slider
            id="tolerance-slider"
            min={0}
            max={255}
            step={1}
            value={[tolerance]}
            onValueChange={(vals) => onToleranceChange(vals[0])}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={onApplyCorners}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply (Corners)
              </>
            )}
          </Button>

          <Button
            variant={isSampling ? "default" : "outline"}
            className="w-full"
            onClick={onToggleSampling}
          >
            <Pipette className="h-4 w-4 mr-2" />
            {isSampling ? 'Sampling Active' : 'Color Picker'}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={onFlipHorizontal}
            disabled={!hasTransparent || processingFlip}
          >
            {processingFlip ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Flipping...
              </>
            ) : (
              <>
                <FlipHorizontal className="h-4 w-4 mr-2" />
                Flip Horizontal
              </>
            )}
          </Button>
        </div>

        {isSampling && (
          <p className="text-xs text-muted-foreground">
            Click on the image to sample a color
          </p>
        )}

        {!hasTransparent && (
          <p className="text-xs text-muted-foreground">
            Create transparency first to enable flipping
          </p>
        )}

        {hasFlipped && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Flipped version available in version selector
          </p>
        )}
      </CardContent>
    </Card>
  );
}
