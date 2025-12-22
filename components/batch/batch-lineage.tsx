"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ChevronRight } from "lucide-react";
import { memo } from "react";

interface BatchLineageProps {
  parentBatch?: { id: string; name: string } | null;
  childBatches?: { id: string; name: string; version: number }[];
}

export const BatchLineage = memo(function BatchLineage({ parentBatch, childBatches }: BatchLineageProps) {
  const router = useRouter();

  if (!parentBatch && (!childBatches || childBatches.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Lineage</CardTitle>
        <CardDescription>Related versions and parent batches</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {parentBatch && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">
              Parent Batch
            </h4>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push(`/batches/${parentBatch.id}`)}
            >
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {parentBatch.name}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {childBatches && childBatches.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">
              Child Batches
            </h4>
            <div className="grid gap-2">
              {childBatches.map((child) => (
                <Button
                  key={child.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/batches/${child.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {child.name}
                    <Badge variant="secondary" className="text-[10px]">
                      v{child.version}
                    </Badge>
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
});
