"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AudioPrompt {
  promptText: string;
  overrides?: {
    duration?: number;
    count?: number;
    temperature?: number;
  };
}

export default function NewAudioBatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<'audiocraft' | 'elevenlabs'>('elevenlabs');
  const [useAutoDuration, setUseAutoDuration] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(1);
  const [defaultCount, setDefaultCount] = useState(1);
  const [defaultTemperature, setDefaultTemperature] = useState(1.0);

  const [prompts, setPrompts] = useState<AudioPrompt[]>([
    { promptText: "" }
  ]);

  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

  const addPrompt = () => {
    setPrompts([...prompts, { promptText: "" }]);
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const updatePrompt = (index: number, promptText: string) => {
    const updated = [...prompts];
    updated[index] = { ...updated[index], promptText };
    setPrompts(updated);
  };

  const handleAiAssist = async (index: number) => {
    const concept = prompts[index].promptText;
    if (!concept.trim()) return;

    setGeneratingIndex(index);
    try {
      const response = await fetch('/api/agents/create-audio-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.prompt) {
          updatePrompt(index, data.prompt);
        }
      }
    } catch (error) {
      console.error('Error with AI assist:', error);
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a batch name');
      return;
    }

    const validPrompts = prompts.filter(p => p.promptText.trim());
    if (validPrompts.length === 0) {
      toast.error('Please enter at least one prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/audio-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          provider,
          defaults: {
            duration: useAutoDuration ? 0 : defaultDuration,
            count: defaultCount,
            temperature: defaultTemperature,
            topK: 250,
            cfgCoef: 3.0,
          },
          prompts: validPrompts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create audio batch');
      }

      const data = await response.json();
      toast.success('Audio batch created successfully!');
      router.push(`/audio-batches/${data.audioBatch.id}`);
    } catch (error) {
      console.error('Error creating audio batch:', error);
      toast.error('Failed to create audio batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Audio Batch</h1>
        <p className="text-muted-foreground">
          Create a new batch for audio generation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
            <CardDescription>Basic information about your audio batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Game SFX Collection"
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
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Audio Provider</Label>
              <Select value={provider} onValueChange={(value: 'audiocraft' | 'elevenlabs') => setProvider(value)}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">✨ ElevenLabs (Recommended)</SelectItem>
                  <SelectItem value="audiocraft">🎵 AudioCraft</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ElevenLabs produces higher quality sound effects
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
            <CardDescription>These settings apply to all prompts unless overridden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Duration: {useAutoDuration ? 'Auto' : `${defaultDuration}s`}</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-duration"
                    checked={useAutoDuration}
                    onCheckedChange={setUseAutoDuration}
                  />
                  <Label htmlFor="auto-duration" className="text-sm cursor-pointer">Auto Duration</Label>
                </div>
              </div>
              <Slider
                value={[defaultDuration]}
                onValueChange={(value) => setDefaultDuration(value[0])}
                min={0.5}
                max={10}
                step={0.5}
                disabled={useAutoDuration}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {useAutoDuration
                  ? 'Let the AI automatically determine the optimal duration based on the prompt'
                  : 'Length of generated audio in seconds'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Count: {defaultCount}</Label>
              </div>
              <Slider
                value={[defaultCount]}
                onValueChange={(value) => setDefaultCount(value[0])}
                min={1}
                max={25}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Number of variations per prompt</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature: {defaultTemperature.toFixed(1)}</Label>
              </div>
              <Slider
                value={[defaultTemperature]}
                onValueChange={(value) => setDefaultTemperature(value[0])}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Higher values = more creative, lower = more predictable</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Prompts</CardTitle>
                <CardDescription>Describe the sounds you want to generate</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPrompt}>
                <Plus className="h-4 w-4 mr-2" />
                Add Prompt
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prompts.map((prompt, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`prompt-${index}`}>Prompt {index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => handleAiAssist(index)}
                    disabled={generatingIndex === index || !prompt.promptText.trim()}
                  >
                    {generatingIndex === index ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3 w-3" />
                    )}
                    AI Assist
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      id={`prompt-${index}`}
                      value={prompt.promptText}
                      onChange={(e) => updatePrompt(index, e.target.value)}
                      placeholder={`e.g., "laser turret" - AI will expand this into a detailed prompt`}
                      rows={3}
                    />
                  </div>
                  {prompts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePrompt(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Enter a simple concept, then click AI Assist to generate a detailed audio prompt
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Audio Batch
          </Button>
        </div>
      </form>
    </div>
  );
}
