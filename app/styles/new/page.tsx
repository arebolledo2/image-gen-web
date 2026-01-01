"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { toast } from "sonner";

export default function NewStylePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [primaryColors, setPrimaryColors] = useState(["#000000", "#ffffff"]);
  const [accentColors, setAccentColors] = useState(["#ff0000"]);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const [materials, setMaterials] = useState([""]);
  const [effects, setEffects] = useState([""]);
  const [finish, setFinish] = useState("");

  const addColor = (type: 'primary' | 'accent') => {
    if (type === 'primary') {
      setPrimaryColors([...primaryColors, "#000000"]);
    } else {
      setAccentColors([...accentColors, "#000000"]);
    }
  };

  const removeColor = (type: 'primary' | 'accent', index: number) => {
    if (type === 'primary') {
      setPrimaryColors(primaryColors.filter((_, i) => i !== index));
    } else {
      setAccentColors(accentColors.filter((_, i) => i !== index));
    }
  };

  const updateColor = (type: 'primary' | 'accent', index: number, value: string) => {
    if (type === 'primary') {
      const updated = [...primaryColors];
      updated[index] = value;
      setPrimaryColors(updated);
    } else {
      const updated = [...accentColors];
      updated[index] = value;
      setAccentColors(updated);
    }
  };

  const addItem = (setter: (arr: string[]) => void, arr: string[]) => {
    setter([...arr, ""]);
  };

  const removeItem = (setter: (arr: string[]) => void, arr: string[], index: number) => {
    setter(arr.filter((_, i: number) => i !== index));
  };

  const updateItem = (setter: (arr: string[]) => void, arr: string[], index: number, value: string) => {
    const updated = [...arr];
    updated[index] = value;
    setter(updated);
  };

  const handleAIGenerate = async (aiDescription: string) => {
    const response = await fetch('/api/agents/create-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: aiDescription }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate style');
    }

    const { style } = await response.json();

    // Populate form with AI-generated style
    setName(style.name);
    setDescription(style.description || '');
    setPrimaryColors(style.palette.primary);
    setAccentColors(style.palette.accent);
    setBackgroundColor(style.palette.background);
    setMaterials(style.renderingCues.materials);
    setEffects(style.renderingCues.effects);
    setFinish(style.renderingCues.finish);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          palette: {
            primary: primaryColors.filter(c => c),
            accent: accentColors.filter(c => c),
            background: backgroundColor,
          },
          renderingCues: {
            materials: materials.filter(m => m.trim()),
            effects: effects.filter(e => e.trim()),
            finish,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create style');
      }

      const data = await response.json();
      toast.success('Style created successfully!');
      router.push(`/styles/${data.style.id}`);
    } catch (error) {
      console.error('Error creating style:', error);
      toast.error('Failed to create style');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Style</h1>
          <p className="text-muted-foreground">
            Define a new art style with palette and rendering cues
          </p>
        </div>
        <AIAssistButton
          onGenerate={handleAIGenerate}
          title="AI Style Generator"
          description="Describe the style you want to create and AI will generate a complete style definition for you."
          placeholder="e.g., A cyberpunk neon aesthetic with chrome metals and electric colors, or a ceramic toybox style with pastel colors..."
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Style Information</CardTitle>
            <CardDescription>Basic details about this style</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Neon Synth"
                required
              />
              <p className="text-[10px] text-muted-foreground italic">AI uses the style name to set the overall artistic direction</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this style..."
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground italic">AI uses this description when generating palette and cues using the AI Style Generator above</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Define the color scheme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Colors</Label>
              {primaryColors.map((color, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor('primary', index, e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => updateColor('primary', index, e.target.value)}
                    className="flex-1"
                  />
                  {primaryColors.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeColor('primary', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addColor('primary')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Primary Color
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Accent Colors</Label>
              {accentColors.map((color, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => updateColor('accent', index, e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => updateColor('accent', index, e.target.value)}
                    className="flex-1"
                  />
                  {accentColors.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeColor('accent', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => addColor('accent')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Accent Color
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="background"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendering Cues</CardTitle>
            <CardDescription>Materials, effects, and finish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Materials</Label>
              {materials.map((material, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={material}
                    onChange={(e) => updateItem(setMaterials, materials, index, e.target.value)}
                    placeholder="e.g., chrome, glossy metal"
                  />
                  {materials.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(setMaterials, materials, index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addItem(setMaterials, materials)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Material
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Effects</Label>
              {effects.map((effect, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={effect}
                    onChange={(e) => updateItem(setEffects, effects, index, e.target.value)}
                    placeholder="e.g., soft bloom, emissive seams"
                  />
                  {effects.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeItem(setEffects, effects, index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addItem(setEffects, effects)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Effect
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="finish">Finish *</Label>
              <Input
                id="finish"
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                placeholder="e.g., glossy, matte, semi-gloss"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !name || !finish}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Style
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
