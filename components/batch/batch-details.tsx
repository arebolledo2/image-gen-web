"use client";

/**
 * Batch Details Component
 * Note: Uses `any` for dynamic batch data from API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProviderType } from "@/lib/config/resolution-presets";
import { memo } from "react";

interface BatchDetailsProps {
  batch: {
    provider: ProviderType;
    createdAt: string;
    completedAt: string | null;
    batchPrompts: any[];
    generations: any[];
    defaults: any;
  };
}

const getProviderLabel = (provider: string) => {
  switch (provider) {
    case 'openai':
      return '🖼️ OpenAI GPT Image 2';
    case 'openrouter':
      return '🌐 OpenRouter GPT-5.4 Image 2';
    case 'gemini':
      return '⚡ Google Gemini 2.5';
    case 'gemini3':
      return '✨ Google Gemini 3 Pro';
    case 'comfyui':
      return '🎨 ComfyUI';
    default:
      return provider;
  }
};

export const BatchDetails = memo(function BatchDetails({ batch }: BatchDetailsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-medium">
              {getProviderLabel(batch.provider)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(batch.createdAt).toLocaleString()}</span>
          </div>
          {batch.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span>{new Date(batch.completedAt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prompts:</span>
            <span>{batch.batchPrompts.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Images per prompt:</span>
            <span>{batch.defaults?.count || 1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total generations:</span>
            <span>{batch.generations.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Successful:</span>
            <span className="text-green-600">
              {batch.generations.filter(g => g.status === 'success').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Failed:</span>
            <span className="text-red-600">
              {batch.generations.filter(g => g.status === 'failed').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending:</span>
            <span className="text-gray-600">
              {batch.generations.filter(g => g.status === 'pending').length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
