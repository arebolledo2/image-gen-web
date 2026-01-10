"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Box, X } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";

interface Subject {
  id: string;
  name: string;
  version: number;
  description: string | null;
  isTransparent: boolean;
  createdAt: string;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isTransparent, setIsTransparent] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          isTransparent
        }),
      });
      if (response.ok) {
        setNewName("");
        setNewDescription("");
        setIsTransparent(true);
        setShowNewForm(false);
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error creating subject:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiAssist = async (concept: string) => {
    try {
      const response = await fetch('/api/agents/create-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subject) {
          setNewName(data.subject.name);
          setNewDescription(data.subject.description);
        }
      }
    } catch (error) {
      console.error('Error with AI assist:', error);
      throw error; // Re-throw so AIAssistButton can show error toast
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
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage entities you want to generate (e.g., enemy, turret)
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Subject
        </Button>
      </div>

      {showNewForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Subject</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name">Name</Label>
                  <AIAssistButton
                    onGenerate={handleAiAssist}
                    title="AI Subject Generator"
                    description="Describe your subject concept and AI will generate a detailed name and description"
                    placeholder="e.g., mechanical spider, cyberpunk samurai, glowing jellyfish"
                    buttonVariant="outline"
                  />
                </div>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Spider Tank"
                  required
                />
                <p className="text-[10px] text-muted-foreground italic">AI uses this as the primary subject name</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of the subject..."
                />
                <p className="text-[10px] text-muted-foreground italic">AI uses this to add specific details and features to the subject</p>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Switch
                  id="isTransparent"
                  checked={isTransparent}
                  onCheckedChange={setIsTransparent}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="isTransparent">Transparent Background</Label>
                  <p className="text-[10px] text-muted-foreground">
                    ALWAYS include magenta background for sprite transparency
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Subject
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No subjects yet. Create your first subject to get started!
              </p>
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Subject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card
              key={subject.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/subjects/${subject.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5" />
                      {subject.name}
                      <Badge variant="outline">v{subject.version}</Badge>
                      {subject.isTransparent && (
                        <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-200">
                          Transparent
                        </Badge>
                      )}
                    </CardTitle>
                    {subject.description && (
                      <CardDescription>
                        {subject.description}
                      </CardDescription>
                    )}
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
