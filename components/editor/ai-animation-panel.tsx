"use client";

import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIAnimationPanelProps {
  prompt: string;
  gridSize: 2 | 3 | 4;
  processing: boolean;
  suggesting: boolean;
  loading: boolean;
  animations: any[];
  onPromptChange: (prompt: string) => void;
  onGridSizeChange: (size: 2 | 3 | 4) => void;
  onSuggest: () => void;
  onGenerate: () => void;
  onRefresh: () => void;
  onDelete: (animationId: string) => void;
}

export function AIAnimationPanel({
  prompt,
  gridSize,
  processing,
  suggesting,
  loading,
  animations,
  onPromptChange,
  onGridSizeChange,
  onSuggest,
  onGenerate,
  onRefresh,
  onDelete,
}: AIAnimationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Animation
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
        {/* Suggest Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onSuggest}
          disabled={suggesting}
        >
          {suggesting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Suggesting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest Animation
            </>
          )}
        </Button>

        {/* Prompt Textarea */}
        <div className="space-y-2">
          <Label className="text-xs">Animation Description:</Label>
          <Textarea
            className="text-xs min-h-[80px]"
            placeholder="Describe the animation (e.g., 'walks forward with bouncy steps')"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
        </div>

        {/* Grid Size Selector */}
        <div className="space-y-2">
          <Label className="text-xs">Grid Size (frames):</Label>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map(size => {
              const frameCount = size * size;
              return (
                <Button
                  key={size}
                  size="sm"
                  variant={gridSize === size ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => onGridSizeChange(size as 2 | 3 | 4)}
                >
                  {size}×{size}
                  <span className="ml-1 text-[10px] opacity-70">({frameCount}f)</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={onGenerate}
          disabled={processing || !prompt?.trim()}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Animation
            </>
          )}
        </Button>

        {/* Animation List */}
        {animations && animations.length > 0 && (
          <div className="mt-4 space-y-2 pt-4 border-t">
            <Label className="text-xs">AI Animations ({animations.length}):</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {animations.map((animation: any) => (
                <div key={animation.id} className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                  <a
                    href={`/api/squish-animations/${animation.id}/file`}
                    download
                    className="flex-1 hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                    title={animation.aiPrompt}
                  >
                    {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2} - {animation.aiPrompt?.substring(0, 25)}...
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
