"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Palette } from "lucide-react";

interface Style {
  id: string;
  name: string;
  version: number;
  description: string | null;
  palette: {
    primary: string[];
    accent: string[];
    background: string;
  };
  renderingCues: {
    materials: string[];
    effects: string[];
    finish: string;
  };
  createdAt: string;
}

export default function StylesPage() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [loading, setLoading] = useState(true);

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
          <h1 className="text-3xl font-bold tracking-tight">Styles</h1>
          <p className="text-muted-foreground">
            Manage your art styles and versions
          </p>
        </div>
        <Link href="/styles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Style
          </Button>
        </Link>
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
          {styles.map((style) => (
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Palette</h4>
                  <div className="flex gap-1">
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
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {style.renderingCues.materials.slice(0, 2).map((material) => (
                    <Badge key={material} variant="secondary" className="text-xs">
                      {material}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
