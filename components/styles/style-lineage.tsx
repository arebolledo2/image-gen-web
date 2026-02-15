"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, ChevronRight } from "lucide-react";

interface StyleLineageProps {
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

export function StyleLineage({ parentStyle, childStyles }: StyleLineageProps) {
  const router = useRouter();

  if (!parentStyle && (!childStyles || childStyles.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Style Lineage</CardTitle>
        <CardDescription>Related versions and parent styles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parentStyle && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Style</h4>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push(`/styles/${parentStyle.id}`)}
            >
              <span className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {parentStyle.name}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {childStyles && childStyles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Styles</h4>
            <div className="grid gap-2">
              {childStyles.map((child) => (
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
  );
}
