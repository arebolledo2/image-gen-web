"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileText, Box, Palette, Compass } from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  promptText: string;
  createdAt: string;
  style: {
    name: string;
  };
  subject: {
    name: string;
  };
  promptGuidance: Array<{
    guidance: {
      name: string;
    }
  }>;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Presets</h1>
          <p className="text-muted-foreground">
            Constructed prompt configurations for reuse
          </p>
        </div>
        <Link href="/prompts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Prompt Preset
          </Button>
        </Link>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No prompt presets yet. Construct your first preset!
              </p>
              <Link href="/prompts/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Preset
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {prompt.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 italic">
                      {prompt.promptText}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded">
                    <Palette className="h-3 w-3" />
                    <span className="font-medium">Style:</span> {prompt.style.name}
                  </div>
                  <div className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded">
                    <Box className="h-3 w-3" />
                    <span className="font-medium">Subject:</span> {prompt.subject.name}
                  </div>
                  {prompt.promptGuidance.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <Compass className="h-3 w-3 text-muted-foreground" />
                        {prompt.promptGuidance.map((pg, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                                {pg.guidance.name}
                            </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
