"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";

interface Style {
  id: string;
  name: string;
}

export default function NewPromptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [styles, setStyles] = useState<Style[]>([]);

  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [styleId, setStyleId] = useState("");
  const [tags, setTags] = useState<string[]>([""]);

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/styles');
      const data = await response.json();
      setStyles(data.styles || []);
    } catch (error) {
      console.error('Error fetching styles:', error);
    }
  };

  const addTag = () => {
    setTags([...tags, ""]);
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, value: string) => {
    const updated = [...tags];
    updated[index] = value;
    setTags(updated);
  };

  const extractVariables = (text: string) => {
    const regex = /\{(\w+)\}/g;
    const matches = text.matchAll(regex);
    const variables: Record<string, any> = {};

    for (const match of matches) {
      const varName = match[1];
      if (!variables[varName]) {
        variables[varName] = {
          type: 'text',
          required: true,
          defaultValue: '',
        };
      }
    }

    return variables;
  };

  const handleAIGenerate = async (aiDescription: string) => {
    const response = await fetch('/api/agents/create-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetType: 'sprite', // Could be made dynamic
        styleId: styleId && styleId !== 'none' ? styleId : null,
        description: aiDescription,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate prompt');
    }

    const { prompt } = await response.json();

    // Populate form with AI-generated prompt
    setName(prompt.name);
    setTemplate(prompt.template);
    setTags(prompt.tags || [""]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const variables = extractVariables(template);

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          template,
          variables,
          styleId: styleId && styleId !== 'none' ? styleId : null,
          tags: tags.filter(t => t.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prompt');
      }

      const data = await response.json();
      router.push(`/prompts/${data.prompt.id}`);
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('Failed to create prompt');
    } finally {
      setLoading(false);
    }
  };

  const detectedVariables = extractVariables(template);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Prompt</h1>
          <p className="text-muted-foreground">
            Build a reusable prompt template with variables
          </p>
        </div>
        <AIAssistButton
          onGenerate={handleAIGenerate}
          title="AI Prompt Generator"
          description="Describe the prompt template you want to create and AI will generate it for you."
          placeholder="e.g., Create a 4x4 sprite sheet prompt for turrets with customizable subject and colors..."
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Prompt Information</CardTitle>
            <CardDescription>Basic details about this prompt template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 4x4 Sprite Sheet Template"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Associated Style</Label>
              <Select value={styleId} onValueChange={setStyleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a style (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>
              Use {"{"}variable{"}"} syntax for dynamic values. Example: {"{"}subject{"}"}, {"{"}color{"}"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template">Prompt Template *</Label>
              <Textarea
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="4x4 sprite sheet of {subject}, {style} style, {color} colors, magenta background"
                rows={6}
                required
              />
            </div>

            {Object.keys(detectedVariables).length > 0 && (
              <div className="space-y-2">
                <Label>Detected Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(detectedVariables).map((varName) => (
                    <div
                      key={varName}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-mono"
                    >
                      {"{" + varName + "}"}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These variables can be filled in when using this template
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Organize your prompts with tags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tags.map((tag, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={tag}
                  onChange={(e) => updateTag(index, e.target.value)}
                  placeholder="e.g., sprite, animation, turret"
                />
                {tags.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeTag(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addTag}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !name || !template}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Prompt
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
