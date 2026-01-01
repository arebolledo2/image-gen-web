"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  status: string;
  provider: 'gemini' | 'gemini3' | 'comfyui';
  createdAt: string;
  batchPrompts: unknown[];
  generations: {
    images: {
      id: string;
      fileName: string;
    }[];
  }[];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBatches(1, false);
  }, []);

  const fetchBatches = async (pageNum: number, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/batches?page=${pageNum}&limit=9`);
      const data = await response.json();

      if (append) {
        setBatches((prev) => [...prev, ...(data.batches || [])]);
      } else {
        setBatches(data.batches || []);
      }

      setTotalPages(data.pagination?.totalPages || 1);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      fetchBatches(page + 1, true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDelete = async (e: React.MouseEvent, batchId: string, batchName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${batchName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete batch');
      }

      // Remove from local state
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
      toast.success('Batch deleted');
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
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
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Create and manage your image generation batches
          </p>
        </div>
        <Link href="/batches/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Batch
          </Button>
        </Link>
      </div>

      {batches.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No batches yet. Create your first batch to get started!
              </p>
              <Link href="/batches/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Batch
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            const previewImages = batch.generations
              ?.flatMap(gen => gen.images)
              .slice(0, 3) || [];

            return (
              <Card key={batch.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <Link href={`/batches/${batch.id}`} className="block">
                  <div className="aspect-[16/9] bg-muted relative flex border-b">
                    {previewImages.length > 0 ? (
                      <div className="flex w-full h-full">
                        {previewImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative flex-1 border-r last:border-r-0 overflow-hidden"
                          >
                            <Image
                              src={`/api/images/${img.id}/file?size=thumbnail`}
                              alt={img.fileName}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        <ImageIcon className="h-10 w-10 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className={`${getStatusColor(batch.status)} text-white border-0`}>
                        {batch.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
                <CardHeader className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg truncate">
                      <Link href={`/batches/${batch.id}`} className="hover:underline">
                        {batch.name}
                      </Link>
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {batch.provider === 'gemini' ? '⚡ Gemini' : '🎨 ComfyUI'}
                    </Badge>
                  </div>
                  {batch.description && (
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      {batch.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{batch.batchPrompts?.length || 0}</span>
                      <span>prompts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, batch.id, batch.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {page < totalPages && (
        <div className="flex justify-center pt-8 pb-12">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={loadingMore}
            className="min-w-[200px]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Batches'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
