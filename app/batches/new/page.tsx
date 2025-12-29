"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Palette, Box, Compass, Sparkles, Wand2, EyeOff } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { RESOLUTION_PRESETS, DEFAULT_RESOLUTION } from "@/lib/config/resolution-presets";
import { useSettings } from "@/components/providers/settings-provider";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Entity {
  id: string;
  name: string;
}

interface SubjectEntity extends Entity {
  isTransparent: boolean;
}

interface PromptPreset {
  id: string;
  name: string;
  promptText: string;
}

interface BatchPrompt {
  promptText: string;
  promptId?: string;
  overrides?: {
    count?: number;
  };
}

export default function NewBatchPage() {
  const router = useRouter();
  const { promptStyle } = useSettings();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [styles, setStyles] = useState<Entity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);
  const [guidanceList, setGuidanceList] = useState<Entity[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<'gemini' | 'gemini3' | 'comfyui'>('gemini');
  const [defaultCount, setDefaultCount] = useState(1);
  const [resolution, setResolution] = useState<string>(DEFAULT_RESOLUTION);

  // Selection mode: 'preset' or 'construct'
  const [mode, setMode] = useState<'preset' | 'construct'>('preset');

  // For 'preset' mode
  const [selectedPresetId, setSelectedPresetId] = useState("");

  // For 'construct' mode
  const [styleId, setStyleId] = useState("");
  const [omitStyle, setOmitStyle] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedGuidanceIds, setSelectedGuidanceIds] = useState<string[]>([]);

  // Preview and final prompts
  const [composing, setComposing] = useState(false);
  const [previewPrompts, setPreviewPrompts] = useState<{ subjectName: string; promptText: string; promptId?: string }[]>([]);
  const [prompts, setPrompts] = useState<BatchPrompt[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stylesRes, subjectsRes, guidanceRes, presetsRes] = await Promise.all([
        fetch('/api/styles'),
        fetch('/api/subjects'),
        fetch('/api/guidance'),
        fetch('/api/prompts'),
      ]);
      const [stylesData, subjectsData, guidanceData, presetsData] = await Promise.all([
        stylesRes.json(),
        subjectsRes.json(),
        guidanceRes.json(),
        presetsRes.json(),
      ]);
      setStyles(stylesData.styles || []);
      setSubjects(subjectsData.subjects || []);
      setGuidanceList(guidanceData.guidance || []);
      setPresets(presetsData.prompts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const toggleGuidance = (id: string) => {
    setSelectedGuidanceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [metadataLoading, setMetadataLoading] = useState(false);
  const handleGenerateMetadata = async () => {
    if (prompts.length === 0) return;

    setMetadataLoading(true);
    try {
      const combinedPrompt = prompts.map(p => p.promptText).join('\n');
      const response = await fetch('/api/agents/create-batch-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: combinedPrompt }),
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

  const handleConstructPreview = async () => {
    if (mode === 'preset') {
      const preset = presets.find(p => p.id === selectedPresetId);
      if (preset) {
        setPreviewPrompts([{ subjectName: 'Preset', promptText: preset.promptText, promptId: preset.id }]);
      }
    } else {
      if ((!omitStyle && !styleId) || selectedSubjectIds.length === 0) return;
      setComposing(true);
      try {
        const promises = selectedSubjectIds.map(async (subId) => {
          const subject = subjects.find(s => s.id === subId);
          const response = await fetch('/api/agents/compose-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              styleId: omitStyle ? undefined : styleId,
              subjectId: subId,
              guidanceIds: selectedGuidanceIds,
              promptStyle
            })
          });
          const data = await response.json();
          return {
            subjectName: subject?.name || 'Unknown',
            promptText: data.promptText
          };
        });

        const results = await Promise.all(promises);
        setPreviewPrompts(results);
      } catch (error) {
        console.error('Error composing prompts:', error);
      } finally {
        setComposing(false);
      }
    }
  };

  const addToBatch = (index?: number) => {
    if (index !== undefined) {
      const preview = previewPrompts[index];
      setPrompts([...prompts, { promptText: preview.promptText, promptId: preview.promptId }]);
      setPreviewPrompts(prev => prev.filter((_, i) => i !== index));
    } else {
      const newPrompts = previewPrompts.map(p => ({
        promptText: p.promptText,
        promptId: p.promptId
      }));
      setPrompts([...prompts, ...newPrompts]);
      setPreviewPrompts([]);
    }
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleEditPreview = (index: number, newText: string) => {
    setPreviewPrompts(prev => prev.map((p, i) => i === index ? { ...p, promptText: newText } : p));
  };

  const handleAdjustPreview = async (index: number, suggestion: string) => {
    const preview = previewPrompts[index];
    const response = await fetch('/api/agents/adjust-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basePrompt: preview.promptText,
        suggestion,
        promptStyle
      })
    });

    if (!response.ok) throw new Error('Failed to adjust prompt');
    const data = await response.json();
    handleEditPreview(index, data.promptText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          provider,
          defaults: {
            count: defaultCount,
            resolution: resolution,
          },
          prompts: prompts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create batch');
      }

      const data = await response.json();
      toast.success('Batch created successfully! Generations started.');
      router.push(`/batches/${data.batch.id}`);
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Batch</h1>
        <p className="text-muted-foreground">
          Set up a new batch of image generations using constructed prompts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Prompt Selection/Construction */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select or Construct Prompt</CardTitle>
            <CardDescription>Select a preset or build a new prompt building blocks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
              <Button
                type="button"
                variant={mode === 'preset' ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode('preset')}
                className={mode === 'preset' ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}
              >
                Use Preset
              </Button>
              <Button
                type="button"
                variant={mode === 'construct' ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode('construct')}
                className={mode === 'construct' ? "bg-background text-foreground shadow-sm hover:bg-background" : ""}
              >
                Construct New
              </Button>
            </div>

            {mode === 'preset' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Prompt Preset</Label>
                  <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Style</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="omitStyle"
                          checked={omitStyle}
                          onCheckedChange={(checked: boolean) => {
                            setOmitStyle(checked);
                            if (checked) setStyleId("");
                          }}
                        />
                        <label
                          htmlFor="omitStyle"
                          className="text-sm font-medium flex items-center gap-1 text-muted-foreground cursor-pointer"
                        >
                          <EyeOff className="h-3 w-3" />
                          Omit Style
                        </label>
                      </div>
                    </div>
                    <Select
                      value={styleId}
                      onValueChange={setStyleId}
                      disabled={omitStyle}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style..." />
                      </SelectTrigger>
                      <SelectContent>
                        {styles.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Box className="h-4 w-4" /> Subjects</Label>
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] max-h-[200px] overflow-y-auto">
                      {subjects.map((s) => (
                        <Badge
                          key={s.id}
                          variant={selectedSubjectIds.includes(s.id) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${s.isTransparent && !selectedSubjectIds.includes(s.id) ? "border-pink-200 text-pink-600" : ""}`}
                          onClick={() => toggleSubject(s.id)}
                        >
                          {s.name}
                          {s.isTransparent && <span className="ml-1 text-[8px] opacity-70">★</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Compass className="h-4 w-4" /> Guidance</Label>
                  <div className="flex flex-wrap gap-2">
                    {guidanceList.map((g) => (
                      <Badge
                        key={g.id}
                        variant={selectedGuidanceIds.includes(g.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleGuidance(g.id)}
                      >
                        {g.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              className="w-full"
              onClick={handleConstructPreview}
              disabled={composing || (mode === 'preset' && !selectedPresetId) || (mode === 'construct' && ((!omitStyle && !styleId) || selectedSubjectIds.length === 0))}
            >
              {composing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {mode === 'preset' ? "Preview Preset" : `Construct Previews (${selectedSubjectIds.length})`}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Preview and Add to Batch */}
        {previewPrompts.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">2. Preview Constructed Prompts ({previewPrompts.length})</CardTitle>
              <Button type="button" size="sm" onClick={() => addToBatch()} className="h-8">
                <Plus className="mr-2 h-4 w-4" /> Add All to Batch
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {previewPrompts.map((p, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-background border rounded-lg group">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {p.subjectName}
                        </div>
                        <AIAssistButton
                          label="Adjust"
                          title="Adjust Prompt"
                          description="Make a quick suggestion to adjust this prompt."
                          placeholder="e.g., make it more futuristic, add more blue..."
                          onGenerate={(suggestion) => handleAdjustPreview(index, suggestion)}
                        />
                      </div>
                      <Textarea
                        value={p.promptText}
                        onChange={(e) => handleEditPreview(index, e.target.value)}
                        className="text-sm italic text-muted-foreground min-h-[80px] bg-muted/30"
                        placeholder="Edit prompt..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => addToBatch(index)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setPreviewPrompts(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Batch Selection and Metadata */}
        {prompts.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3. Selected Prompts ({prompts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prompts.map((p, index) => (
                  <div key={index} className="flex gap-4 p-3 border rounded-lg relative group">
                    <div className="flex-1 text-sm text-muted-foreground italic">
                      {p.promptText}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removePrompt(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

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
                  <Select value={provider} onValueChange={(value: 'gemini' | 'gemini3' | 'comfyui') => setProvider(value)}>
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">⚡ Google Gemini 2.5 (Fast)</SelectItem>
                      <SelectItem value="gemini3">✨ Google Gemini 3 Pro (New)</SelectItem>
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
                      {RESOLUTION_PRESETS.map((preset) => (
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

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || !name}
                className="flex-1 h-12 text-lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Batch & Start Generations
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
