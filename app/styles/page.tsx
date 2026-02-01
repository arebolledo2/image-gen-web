"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Palette, Star } from "lucide-react";
import { toast } from "sonner";

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
  isFavorite: boolean;
}

export default function StylesPage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, styleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(`/api/styles/${styleId}/favorite`, {
        method: 'PATCH',
      });
      if (response.ok) {
        const data = await response.json();
        setStyles(styles.map(s =>
          s.id === styleId ? { ...s, isFavorite: data.style.isFavorite } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("Failed to update favorite");
    }
  };

  const filteredStyles = favoritesOnly ? styles.filter(s => s.isFavorite) : styles;

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
          <h1 className="text-3xl font-bold tracking-tight">Styles</h1>
          <p className="text-muted-foreground">
            Manage your art styles and versions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="icon"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            aria-label="Toggle favorites"
            className={favoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
          >
            <Star className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
          </Button>
          <Link href="/styles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Style
            </Button>
          </Link>
        </div>
      </div>

      {styles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No styles yet. Create your first style to get started!
              </p>
              <Link href="/styles/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Style
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStyles.map((style) => (
            <Card key={style.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      <Link
                        href={`/styles/${style.id}`}
                        className="hover:underline"
                      >
                        {style.name}
                      </Link>
                      <Badge variant="outline">v{style.version}</Badge>
                    </CardTitle>
                    {style.description && (
                      <CardDescription className="line-clamp-2">
                        {style.description}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => handleToggleFavorite(e, style.id)}
                  >
                    <Star className={`h-4 w-4 ${style.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Palette</h4>
                  <div className="flex gap-1">
                    {Array.isArray(style.palette) ? (
                      style.palette.slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))
                    ) : (
                      <>
                        {style.palette.primary.slice(0, 3).map((color, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        {style.palette.accent.slice(0, 2).map((color, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(style.renderingCues) ? (
                    style.renderingCues.slice(0, 3).map((cue) => (
                      <Badge key={cue} variant="secondary" className="text-xs">
                        {cue}
                      </Badge>
                    ))
                  ) : (
                    style.renderingCues.materials.slice(0, 2).map((material) => (
                      <Badge key={material} variant="secondary" className="text-xs">
                        {material}
                      </Badge>
                    ))
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
