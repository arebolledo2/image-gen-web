"use client";

/**
 * AI Edit Panel Component
 * Note: Uses `any` for dynamic edit data from API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wand2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIEditPanelProps {
  prompt: string;
  processing: boolean;
  loading: boolean;
  edits: any[];
  sourceVersion: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onRefresh: () => void;
  onDelete: (editId: string) => void;
  onEditSelect: (editId: string) => void;
}

function getVersionDisplayName(version: string): string {
  if (version === 'original') return 'Original';
  if (version === 'transparent') return 'Transparent';
  if (version === 'flipped') return 'Flipped';
  if (version.startsWith('squish-')) return 'Squish Animation';
  if (version.startsWith('ai-')) return 'AI Animation';
  if (version.startsWith('edit-')) return 'Edited Version';
  return version;
}

export function AIEditPanel({
  prompt,
  processing,
  loading,
  edits,
  sourceVersion,
  onPromptChange,
  onGenerate,
  onRefresh,
  onDelete,
  onEditSelect,
}: AIEditPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            AI Edit
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
        {/* Source Version Display */}
        <div className="text-xs text-muted-foreground">
          Editing: <span className="font-medium">{getVersionDisplayName(sourceVersion)}</span>
        </div>

        {/* Prompt Textarea */}
        <div className="space-y-2">
          <Label className="text-xs">Edit Instructions:</Label>
          <Textarea
            className="text-xs min-h-[80px]"
            placeholder="Describe how to edit the image (e.g., 'Change background to sunset', 'Add a red hat')"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
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
              Generating Edit...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate AI Edit
            </>
          )}
        </Button>

        {/* Edit History List */}
        {edits && edits.length > 0 && (
          <div className="mt-4 space-y-2 pt-4 border-t">
            <Label className="text-xs">Edit History ({edits.length}):</Label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {edits.map((edit: any) => (
                <div key={edit.id} className="flex items-center gap-2 text-xs bg-muted p-2 rounded">
                  <button
                    onClick={() => onEditSelect(edit.id)}
                    className="flex-1 text-left hover:underline truncate"
                    title={`${edit.generatedName} - ${edit.userPrompt}`}
                  >
                    <span className="font-medium">{edit.generatedName}</span>
                    <span className="text-muted-foreground ml-1">
                      - {edit.userPrompt.substring(0, 30)}{edit.userPrompt.length > 30 ? '...' : ''}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => onDelete(edit.id)}
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
