"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Compass, X } from "lucide-react";

interface Guidance {
  id: string;
  name: string;
  version: number;
  description: string;
  createdAt: string;
}

export default function GuidancePage() {
  const router = useRouter();
  const [guidanceList, setGuidanceList] = useState<Guidance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGuidance();
  }, []);

  const fetchGuidance = async () => {
    try {
      const response = await fetch('/api/guidance');
      const data = await response.json();
      setGuidanceList(data.guidance || []);
    } catch (error) {
      console.error('Error fetching guidance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });
      if (response.ok) {
        setNewName("");
        setNewDescription("");
        setShowNewForm(false);
        fetchGuidance();
      }
    } catch (error) {
      console.error('Error creating guidance:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guidance</h1>
          <p className="text-muted-foreground">
            Specific instructions for prompt construction (e.g., "4x4 sprite sheet")
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Guidance
        </Button>
      </div>

      {showNewForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Guidance</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., 4x4 Sprite Sheet"
                  required
                />
                <p className="text-[10px] text-muted-foreground italic">AI uses this to identify the specific instruction</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., 4x4 grid of 16 frames, magenta background, consistent size..."
                  required
                />
                <p className="text-[10px] text-muted-foreground italic">AI uses this description to implement technical details of the instruction</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Guidance
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {guidanceList.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No guidance yet. Create your first guidance to get started!
              </p>
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Guidance
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guidanceList.map((guidance) => (
            <Card
              key={guidance.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/guidance/${guidance.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Compass className="h-5 w-5" />
                      {guidance.name}
                      <Badge variant="outline">v{guidance.version}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {guidance.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
