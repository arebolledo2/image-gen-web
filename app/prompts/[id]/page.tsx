"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { useAIModelSettings } from "@/components/providers/ai-model-settings-provider";

interface Prompt {
  id: string;
  name: string;
  template: string;
  variables: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  style: {
    id: string;
    name: string;
  } | null;
  subject: {
    id: string;
    name: string;
    isTransparent: boolean;
  } | null;
}

export default function PromptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toRequestConfig } = useAIModelSettings();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/prompts/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch prompt");
        }
        const data = await response.json();
        if (!cancelled) setPrompt(data.prompt);
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching prompt:", error);
        toast.error("Failed to load prompt");
        router.push("/prompts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this prompt?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/prompts/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete prompt");
      }

      router.push("/prompts");
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Failed to delete prompt");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateVariations = async (context: string) => {
    setLoadingVariations(true);
    try {
      const response = await fetch("/api/agents/suggest-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrompt: prompt!.template,
          context,
          isTransparent: prompt?.subject?.isTransparent ?? true,
          aiConfig: toRequestConfig(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate variations");
      }

      const { variations: newVariations } = await response.json();
      setVariations(newVariations);
    } catch (error) {
      console.error("Error generating variations:", error);
      toast.error("Failed to generate variations");
    } finally {
      setLoadingVariations(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prompt) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{prompt.name}</h1>
          <p className="text-muted-foreground">
            Created {new Date(prompt.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/prompts/${prompt.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
          <CardDescription>The prompt template with variables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap">
              {prompt.template}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(prompt.template)}
            >
              Copy Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variables</CardTitle>
          <CardDescription>Detected template variables</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(prompt.variables).length === 0 ? (
            <p className="text-muted-foreground">No variables in this template</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.keys(prompt.variables).map((varName) => (
                <div
                  key={varName}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-mono"
                >
                  {"{" + varName + "}"}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompt.style && (
            <div>
              <div className="text-sm font-medium mb-2">Associated Style</div>
              <Badge variant="outline">{prompt.style.name}</Badge>
            </div>
          )}
          {prompt.tags.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Variations</CardTitle>
              <CardDescription>
                Generate creative variations of this prompt
              </CardDescription>
            </div>
            <AIAssistButton
              onGenerate={handleGenerateVariations}
              label="Generate Variations"
              title="AI Variation Generator"
              description="Describe the context or direction for variations you'd like to see."
              placeholder="e.g., Make it more colorful, add more detail, create a darker version..."
            />
          </div>
        </CardHeader>
        <CardContent>
          {loadingVariations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : variations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No variations generated yet. Click the button above to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {variations.map((variation, index) => (
                <div
                  key={index}
                  className="p-4 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-mono text-sm flex-1">{variation}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(variation)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
