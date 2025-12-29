"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Music, ArrowLeft, Trash2 } from "lucide-react";

interface AudioBatchDetails {
  id: string;
  name: string;
  description: string | null;
  status: string;
  provider: string;
  defaults: {
    duration?: number;
    count?: number;
    temperature?: number;
  };
  audioBatchPrompts: {
    id: string;
    promptText: string;
    order: number;
  }[];
  audioGenerations?: {
    id: string;
    status: string;
    audioFiles: {
      id: string;
      fileName: string;
      duration: number;
      isFavorite: boolean;
    }[];
  }[];
}

export default function AudioBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [batch, setBatch] = useState<AudioBatchDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBatch();
  }, [resolvedParams.id]);

  const fetchBatch = async () => {
    try {
      const response = await fetch(`/api/audio-batches/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch batch');
      const data = await response.json();
      setBatch(data.audioBatch);
    } catch (error) {
      console.error('Error fetching audio batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!batch) return;

    setExecuting(true);
    try {
      const response = await fetch(`/api/audio-batches/${batch.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to execute batch');

      alert('Audio batch queued for execution!');
      fetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      alert('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!batch) return;
    if (!confirm(`Are you sure you want to delete "${batch.name}"?`)) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/audio-batches/${batch.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete batch');

      router.push('/audio-batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
      setDeleting(false);
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
      case 'queued':
        return 'bg-yellow-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 px-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Audio batch not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const audioFiles = batch.audioGenerations?.flatMap(gen => gen.audioFiles) || [];
  const totalGenerations = batch.audioGenerations?.length || 0;
  const completedGenerations = batch.audioGenerations?.filter(g => g.status === 'success').length || 0;
  const failedGenerations = batch.audioGenerations?.filter(g => g.status === 'failed').length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
            <Badge className={`${getStatusColor(batch.status)} text-white border-0`}>
              {batch.status}
            </Badge>
          </div>
          {batch.description && (
            <p className="text-muted-foreground mt-1">{batch.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {batch.status === 'draft' && (
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute
            </Button>
          )}
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span>
                {batch.defaults.duration === 0 || batch.defaults.duration === null || batch.defaults.duration === undefined
                  ? 'Auto'
                  : `${batch.defaults.duration}s`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Count:</span>
              <span>{batch.defaults.count || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature:</span>
              <span>{batch.defaults.temperature?.toFixed(1) || '1.0'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed:</span>
              <span>{completedGenerations} / {totalGenerations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failed:</span>
              <span>{failedGenerations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audio Files:</span>
              <span>{audioFiles.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span>{batch.audioBatchPrompts.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>Audio generation prompts in this batch</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {batch.audioBatchPrompts.map((prompt, index) => (
            <div key={prompt.id} className="flex gap-3 p-3 bg-muted rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm">{prompt.promptText}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {audioFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Generated Audio</CardTitle>
                <CardDescription>{audioFiles.length} audio files</CardDescription>
              </div>
              <Link href={`/audio-gallery?batchId=${batch.id}`}>
                <Button variant="outline" size="sm">
                  <Music className="mr-2 h-4 w-4" />
                  View in Gallery
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {audioFiles.slice(0, 5).map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm truncate flex-1">{file.fileName}</span>
                <span className="text-xs text-muted-foreground">{(file.duration / 1000).toFixed(1)}s</span>
              </div>
            ))}
            {audioFiles.length > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                and {audioFiles.length - 5} more...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
