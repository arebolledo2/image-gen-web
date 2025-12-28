"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Music } from "lucide-react";

interface AudioBatch {
  id: string;
  name: string;
  description: string | null;
  status: string;
  provider: 'audiocraft';
  createdAt: string;
  audioBatchPrompts: unknown[];
  audioGenerations: {
    audioFiles: {
      id: string;
      fileName: string;
    }[];
  }[];
}

export default function AudioBatchesPage() {
  const [audioBatches, setAudioBatches] = useState<AudioBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudioBatches();
  }, []);

  const fetchAudioBatches = async () => {
    try {
      const response = await fetch('/api/audio-batches');
      const data = await response.json();
      setAudioBatches(data.audioBatches || []);
    } catch (error) {
      console.error('Error fetching audio batches:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audio Batches</h1>
          <p className="text-muted-foreground">
            Create and manage your audio generation batches
          </p>
        </div>
        <Link href="/audio-batches/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Audio Batch
          </Button>
        </Link>
      </div>

      {audioBatches.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-4">
                No audio batches yet. Create your first audio batch to get started!
              </p>
              <Link href="/audio-batches/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Audio Batch
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audioBatches.map((batch) => {
            const audioFileCount = batch.audioGenerations
              ?.flatMap(gen => gen.audioFiles).length || 0;
            const promptCount = batch.audioBatchPrompts.length;

            return (
              <Card key={batch.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                <Link href={`/audio-batches/${batch.id}`} className="block">
                  <div className="aspect-[16/9] bg-gradient-to-br from-purple-500/10 to-pink-500/10 relative flex border-b">
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      <Music className="h-16 w-16 opacity-20" />
                    </div>
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
                      <Link href={`/audio-batches/${batch.id}`} className="hover:underline">
                        {batch.name}
                      </Link>
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {batch.provider}
                    </Badge>
                  </div>
                  {batch.description && (
                    <CardDescription className="line-clamp-2">
                      {batch.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{promptCount} prompts</span>
                    <span>{audioFileCount} audio files</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
