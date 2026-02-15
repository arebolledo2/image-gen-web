"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Layers } from "lucide-react";

interface StyleBatch {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  generations: {
    images: {
      id: string;
      fileName: string;
    }[];
  }[];
}

interface StyleBatchesSectionProps {
  batches: StyleBatch[];
  loading: boolean;
}

export function StyleBatchesSection({ batches, loading }: StyleBatchesSectionProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Batches</CardTitle>
            <CardDescription>Generations that use this style</CardDescription>
          </div>
          <Badge variant="secondary">{batches.length} Batches</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p>No batches found for this style.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {batches.map((batch) => {
              const previewImages = batch.generations.flatMap(g => g.images).slice(0, 3);

              return (
                <Button
                  key={batch.id}
                  variant="outline"
                  className="h-auto p-4 justify-between hover:bg-muted/50 transition-colors group"
                  onClick={() => router.push(`/batches/${batch.id}`)}
                >
                  <div className="flex items-center gap-6 text-left overflow-hidden">
                    <div className="flex -space-x-12">
                      {previewImages.length > 0 ? (
                        previewImages.map((img, i) => (
                          <div
                            key={img.id}
                            className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden border shadow-sm transition-transform group-hover:translate-x-2"
                            style={{
                              zIndex: 10 - i,
                              transform: `scale(${1 - i * 0.1})`
                            }}
                          >
                            <Image
                              src={`/api/images/${img.id}/file`}
                              alt={batch.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden border">
                          <Layers className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold truncate max-w-[250px]">{batch.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 items-center mt-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {batch.status}
                        </Badge>
                        <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
