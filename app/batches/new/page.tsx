"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";

interface BatchPrompt {
  promptText: string;
  overrides?: {
    count?: number;
  };
}

export default function NewBatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultCount, setDefaultCount] = useState(1);
  const [prompts, setPrompts] = useState<BatchPrompt[]>([
    { promptText: "" }
  ]);

  const addPrompt = () => {
    setPrompts([...prompts, { promptText: "" }]);
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const updatePrompt = (index: number, text: string) => {
    const updated = [...prompts];
    updated[index].promptText = text;
    setPrompts(updated);
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
          prompts: prompts.filter(p => p.promptText.trim()),
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Batch</h1>
        <p className="text-muted-foreground">
          Set up a new batch of image generations
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
            <CardDescription>
              Basic details about this batch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Enemy Sprites Neon Style"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this batch"
                rows={3}
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
              />
              <p className="text-sm text-muted-foreground">
                How many images to generate for each prompt
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompts</CardTitle>
            <CardDescription>
              Add prompts for image generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prompts.map((prompt, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={prompt.promptText}
                  onChange={(e) => updatePrompt(index, e.target.value)}
                  placeholder="e.g., 4x4 sprite sheet of robot turret with neon synth style, magenta background..."
                  rows={3}
                  className="flex-1"
                />
                {prompts.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removePrompt(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addPrompt}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Prompt
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !name || prompts.every(p => !p.promptText.trim())}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Batch
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
