"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Palette, Star, Trash2 } from "lucide-react";
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
  previews?: { id: string }[];
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

  const handleDelete = async (e: React.MouseEvent, styleId: string, styleName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete style "${styleName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/styles/${styleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete style');
      }

      setStyles((prev) => prev.filter((s) => s.id !== styleId));
      toast.success('Style deleted');
    } catch (error) {
      console.error('Error deleting style:', error);
      toast.error('Failed to delete style');
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
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Styles</h1>
          <p className="text-muted-foreground">
            Manage your art styles and versions
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStyles.map((style) => (
            <Card key={style.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
              <Link href={`/styles/${style.id}`} className="block">
                <div className="aspect-[16/9] bg-muted relative flex flex-col border-b">
                  {style.previews && style.previews.length > 0 ? (
                    <div className="flex w-full h-full">
                      {style.previews.map((img) => (
                        <div
                          key={img.id}
                          className="relative flex-1 border-r last:border-r-0 overflow-hidden"
                        >
                          <Image
                            src={`/api/images/${img.id}/file?size=thumbnail`}
                            alt={style.name}
                            fill
                            sizes="(max-width: 768px) 33vw, 15vw"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex">
                      {Array.isArray(style.palette) ? (
                        style.palette.slice(0, 3).map((color, i) => (
                          <div
                            key={i}
                            className="flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))
                      ) : (
                        <>
                          {style.palette.primary.slice(0, 2).map((color, i) => (
                            <div
                              key={`p-${i}`}
                              className="flex-1"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          {style.palette.accent.slice(0, 1).map((color, i) => (
                            <div
                              key={`a-${i}`}
                              className="flex-1"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-0">
                      v{style.version}
                    </Badge>
                  </div>
                </div>
              </Link>
              <CardHeader className="p-4 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg truncate">
                    <Link href={`/styles/${style.id}`} className="hover:underline flex items-center gap-2">
                      <Palette className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {style.name}
                    </Link>
                  </CardTitle>
                </div>
                {style.description && (
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {style.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-4 pt-0 mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(style.renderingCues) ? (
                    style.renderingCues.slice(0, 4).map((cue) => (
                      <Badge key={cue} variant="outline" className="text-[10px] px-1.5 py-0">
                        {cue}
                      </Badge>
                    ))
                  ) : (
                    style.renderingCues.materials.slice(0, 3).map((material) => (
                      <Badge key={material} variant="outline" className="text-[10px] px-1.5 py-0">
                        {material}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1 text-[10px]">
                    {new Date(style.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDelete(e, style.id, style.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleToggleFavorite(e, style.id)}
                    >
                      <Star className={`h-4 w-4 ${style.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
