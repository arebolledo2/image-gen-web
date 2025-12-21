"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Palette, ChevronRight } from "lucide-react";

interface Style {
  id: string;
  name: string;
  version: number;
  description: string | null;
  palette: string[] | {
    primary: string[];
    accent: string[];
    background: string;
  };
  renderingCues: string[] | {
    materials: string[];
    effects: string[];
    finish: string;
  };
  createdAt: string;
  parentStyle?: {
    id: string;
    name: string;
  } | null;
  childStyles?: {
    id: string;
    name: string;
    version: number;
  }[];
}

export default function StyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [style, setStyle] = useState<Style | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStyle();
  }, [id]);

  const fetchStyle = async () => {
    try {
      const response = await fetch(`/api/styles/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch style");
      }
      const data = await response.json();
      setStyle(data.style);
    } catch (error) {
      console.error("Error fetching style:", error);
      alert("Failed to load style");
      router.push("/styles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this style?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/styles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete style");
      }

      router.push("/styles");
    } catch (error) {
      console.error("Error deleting style:", error);
      alert("Failed to delete style");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!style) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{style.name}</h1>
            <Badge variant="outline">v{style.version}</Badge>
          </div>
          <p className="text-muted-foreground">
            Created {new Date(style.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Primary, accent, and background colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.isArray(style.palette) ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {style.palette.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-md border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">Primary Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.palette.primary.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded-md border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Accent Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.palette.accent.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded-md border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Background</h4>
                  <div className="flex flex-col items-start gap-1">
                    <div
                      className="w-12 h-12 rounded-md border shadow-sm"
                      style={{ backgroundColor: style.palette.background }}
                    />
                    <span className="text-[10px] font-mono">{style.palette.background}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendering Cues</CardTitle>
            <CardDescription>Materials, effects, and finish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.isArray(style.renderingCues) ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Rendering Cues</h4>
                <div className="flex flex-wrap gap-2">
                  {style.renderingCues.map((cue) => (
                    <Badge key={cue} variant="secondary">
                      {cue}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">Materials</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.renderingCues.materials.map((material) => (
                      <Badge key={material} variant="secondary">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Effects</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.renderingCues.effects.map((effect) => (
                      <Badge key={effect} variant="outline">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Finish</h4>
                  <Badge>{style.renderingCues.finish}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {style.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {(style.parentStyle || (style.childStyles && style.childStyles.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Style Lineage</CardTitle>
            <CardDescription>Related versions and parent styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {style.parentStyle && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Style</h4>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/styles/${style.parentStyle!.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {style.parentStyle.name}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {style.childStyles && style.childStyles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Styles</h4>
                <div className="grid gap-2">
                  {style.childStyles.map((child) => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => router.push(`/styles/${child.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        {child.name}
                        <Badge variant="secondary" className="text-[10px]">v{child.version}</Badge>
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
