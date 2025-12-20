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
import { Loader2, Plus, X, Palette, Box, Compass, Sparkles } from "lucide-react";

interface Entity {
  id: string;
  name: string;
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
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [styles, setStyles] = useState<Entity[]>([]);
  const [subjects, setSubjects] = useState<Entity[]>([]);
  const [guidanceList, setGuidanceList] = useState<Entity[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultCount, setDefaultCount] = useState(1);
  
  // Selection mode: 'preset' or 'construct'
  const [mode, setMode] = useState<'preset' | 'construct'>('preset');
  
  // For 'preset' mode
  const [selectedPresetId, setSelectedPresetId] = useState("");
  
  // For 'construct' mode
  const [styleId, setStyleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedGuidanceIds, setSelectedGuidanceIds] = useState<string[]>([]);
  
  // Preview and final prompts
  const [composing, setComposing] = useState(false);
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

  const handleCompose = async () => {
    if (mode === 'preset') {
      const preset = presets.find(p => p.id === selectedPresetId);
      if (preset) {
        setPrompts([{ promptText: preset.promptText, promptId: preset.id }]);
      }
    } else {
      if (!styleId || !subjectId) return;
      setComposing(true);
      try {
        // We call the same logic as prompt creation but without saving the preset
        // For simplicity, we'll reuse the POST /api/prompts but we might want a 
        // /api/agents/compose-prompt endpoint later.
        // For now, let's just use the construction data and let the backend handle it during batch POST.
        // BUT, user wants to see it/add multiple.
        
        // Actually, the simplest is to let the user select a preset they already created, 
        // OR construct one here. If they construct here, we'll just treat it as a one-off.
        
        const response = await fetch('/api/agents/compose-prompt', { // We'll create this endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                styleId,
                subjectId,
                guidanceIds: selectedGuidanceIds
            })
        });
        const data = await response.json();
        setPrompts([...prompts, { promptText: data.promptText }]);
      } catch (error) {
        console.error('Error composing prompt:', error);
      } finally {
        setComposing(false);
      }
    }
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
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
          defaults: {
            count: defaultCount,
          },
          prompts: prompts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create batch');
      }

      const data = await response.json();
      router.push(`/batches/${data.batch.id}`);
    } catch (error) {
      console.error('Error creating batch:', error);
      alert('Failed to create batch');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Batch</h1>
        <p className="text-muted-foreground">
          Set up a new batch of image generations using constructed prompts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Prompt Construction</CardTitle>
            <CardDescription>Select a preset or build a new prompt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 p-1 bg-muted rounded-lg w-fit">
              <Button 
                type="button"
                variant={mode === 'preset' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode('preset')}
              >
                Use Preset
              </Button>
              <Button 
                type="button"
                variant={mode === 'construct' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode('construct')}
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
                    <Label className="flex items-center gap-2"><Palette className="h-4 w-4"/> Style</Label>
                    <Select value={styleId} onValueChange={setStyleId}>
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
                    <Label className="flex items-center gap-2"><Box className="h-4 w-4"/> Subject</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Compass className="h-4 w-4"/> Guidance</Label>
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
                onClick={handleCompose}
                disabled={composing || (mode === 'preset' && !selectedPresetId) || (mode === 'construct' && (!styleId || !subjectId))}
            >
              {composing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {mode === 'preset' ? "Add Preset to Batch" : "Construct & Add to Batch"}
            </Button>
          </CardContent>
        </Card>

        {prompts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Selected Prompts ({prompts.length})</CardTitle>
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
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !name || prompts.length === 0}
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
      </form>
    </div>
  );
}
