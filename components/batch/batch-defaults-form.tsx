"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { type ProviderType } from "@/lib/config/resolution-presets";
import { toast } from "sonner";
import { useAIModelSettings } from "@/components/providers/ai-model-settings-provider";

interface ResolutionPreset {
  id: string;
  label: string;
}

interface BatchDefaultsFormProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  provider: ProviderType;
  onProviderChange: (provider: ProviderType) => void;
  resolution: string;
  setResolution: (resolution: string) => void;
  availableResolutions: ResolutionPreset[];
  defaultCount: number;
  setDefaultCount: (count: number) => void;
  promptTexts: string[];
}

export function BatchDefaultsForm({
  name,
  setName,
  description,
  setDescription,
  provider,
  onProviderChange,
  resolution,
  setResolution,
  availableResolutions,
  defaultCount,
  setDefaultCount,
  promptTexts,
}: BatchDefaultsFormProps) {
  const { toRequestConfig } = useAIModelSettings();
  const [metadataLoading, setMetadataLoading] = useState(false);

  const handleGenerateMetadata = async () => {
    if (promptTexts.length === 0) return;

    setMetadataLoading(true);
    try {
      const combinedPrompt = promptTexts.join('\n');
      const response = await fetch('/api/agents/create-batch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: combinedPrompt, aiConfig: toRequestConfig() }),
      });

      if (!response.ok) throw new Error('Failed to generate metadata');
      const data = await response.json();
      setName(data.name);
      setDescription(data.description);
    } catch (error) {
      console.error('Error generating metadata:', error);
      toast.error('Failed to generate metadata');
    } finally {
      setMetadataLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Batch Information</CardTitle>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateMetadata}
          disabled={metadataLoading}
        >
          {metadataLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          AI Assist
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Batch Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Arctic Exploration Sprites"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider">Generation Provider</Label>
          <Select value={provider} onValueChange={(value: ProviderType) => onProviderChange(value)}>
            <SelectTrigger id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">⚡ Google Gemini 2.5 (Fast, 1K only)</SelectItem>
              <SelectItem value="gemini3">✨ Google Gemini 3 Pro (1K-4K)</SelectItem>
              <SelectItem value="comfyui">🎨 ComfyUI (Advanced)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="resolution">Image Resolution</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger id="resolution">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableResolutions.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="count">Images per Prompt</Label>
          <Input
            id="count"
            type="number"
            min="1"
            max="10"
            value={defaultCount}
            onChange={(e) => setDefaultCount(parseInt(e.target.value))}
            className="w-32"
          />
        </div>
      </CardContent>
    </Card>
  );
}
