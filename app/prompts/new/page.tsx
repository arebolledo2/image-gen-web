"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Box, Palette, Compass } from "lucide-react";

interface Entity {
  id: string;
  name: string;
}

export default function NewPromptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [styles, setStyles] = useState<Entity[]>([]);
  const [subjects, setSubjects] = useState<Entity[]>([]);
  const [guidanceList, setGuidanceList] = useState<Entity[]>([]);

  const [name, setName] = useState("");
  const [styleId, setStyleId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [selectedGuidanceIds, setSelectedGuidanceIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stylesRes, subjectsRes, guidanceRes] = await Promise.all([
        fetch('/api/styles'),
        fetch('/api/subjects'),
        fetch('/api/guidance'),
      ]);
      const [stylesData, subjectsData, guidanceData] = await Promise.all([
        stylesRes.json(),
        subjectsRes.json(),
        guidanceRes.json(),
      ]);
      setStyles(stylesData.styles || []);
      setSubjects(subjectsData.subjects || []);
      setGuidanceList(guidanceData.guidance || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const toggleGuidance = (id: string) => {
    setSelectedGuidanceIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          styleId,
          subjectId,
          guidanceIds: selectedGuidanceIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create prompt');
      }

      const data = await response.json();
      router.push(`/prompts`); // Redirect to list as detail page might need update too
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('Failed to create prompt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Prompt Preset</h1>
        <p className="text-muted-foreground">
          Construct a reusable prompt from building blocks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Preset Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Neon Enemy Spritesheet"
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" /> Style *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={styleId} onValueChange={setStyleId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic mt-2">AI uses the style name, colors, and cues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Box className="h-4 w-4" /> Subject *
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={subjectId} onValueChange={setSubjectId} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a subject" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-4rem)] md:max-w-[400px]">
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id} className="whitespace-normal">
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic mt-2">AI uses both subject name and description</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="h-4 w-4" /> Guidance
            </CardTitle>
            <CardDescription>Multi-select guidance items to refine the prompt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {guidanceList.map((guidance) => (
                <Badge
                  key={guidance.id}
                  variant={selectedGuidanceIds.includes(guidance.id) ? "default" : "outline"}
                  className="cursor-pointer py-1 px-3 text-sm"
                  onClick={() => toggleGuidance(guidance.id)}
                >
                  {guidance.name}
                </Badge>
              ))}
            </div>
            {guidanceList.length === 0 ? (
                <p className="text-sm text-muted-foreground italic mt-2">No guidance items found. Create some in the Guidance section.</p>
            ) : (
                <p className="text-[10px] text-muted-foreground italic mt-2">AI uses guidance descriptions to refine the result</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !name || !styleId || !subjectId}
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Prompt Preset
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
