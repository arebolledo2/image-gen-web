"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Heart, Search, Music, Play, Pause, Copy, Check } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { ApiAudioFileListItem } from "@/lib/types/api";

export default function AudioGalleryPage() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batchId');

  const [audioFiles, setAudioFiles] = useState<ApiAudioFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAudioFiles = useCallback(async () => {
    setLoading(true);
    try {
      setAudioFiles(await api.audio.list({ batchId, favoritesOnly, search: debouncedSearch }));
    } catch (error) {
      console.error('Error fetching audio files:', error);
    } finally {
      setLoading(false);
    }
  }, [favoritesOnly, debouncedSearch, batchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show the loading state immediately when filters change
    fetchAudioFiles();
  }, [fetchAudioFiles]);

  const toggleFavorite = async (audioFile: ApiAudioFileListItem) => {
    try {
      const updated = await api.audio.setFavorite(audioFile.id, !audioFile.isFavorite);

      // Update local state
      setAudioFiles(prev =>
        prev.map(file =>
          file.id === audioFile.id
            ? { ...file, isFavorite: updated.isFavorite }
            : file
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(errorMessage(error, 'Failed to update favorite'));
    }
  };

  const handleDownload = (audioFile: ApiAudioFileListItem) => {
    const link = document.createElement('a');
    link.href = `/api/audio/${audioFile.id}/file?download=true`;
    link.download = audioFile.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyFileName = (audioFile: ApiAudioFileListItem) => {
    navigator.clipboard.writeText(audioFile.fileName);
    setCopiedId(audioFile.id);
    toast.success("Filename copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (ms: number | null) => {
    const seconds = (ms ?? 0) / 1000;
    return `${seconds.toFixed(1)}s`;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audio Gallery</h1>
        <p className="text-muted-foreground">
          Browse and manage your generated audio files
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audio files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="favorites"
                checked={favoritesOnly}
                onCheckedChange={setFavoritesOnly}
              />
              <Label htmlFor="favorites">Favorites only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {audioFiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground mb-4">
                {favoritesOnly || debouncedSearch
                  ? 'No audio files found matching your filters'
                  : 'No audio files yet. Create an audio batch to get started!'}
              </p>
              {!favoritesOnly && !debouncedSearch && (
                <Link href="/audio-batches/new">
                  <Button>Create Audio Batch</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audioFiles.map((audioFile) => (
            <Card key={audioFile.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Audio Player */}
                <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg flex items-center justify-center relative">
                  <Music className="h-12 w-12 text-muted-foreground opacity-30" />
                  <audio
                    id={`audio-${audioFile.id}`}
                    src={`/api/audio/${audioFile.id}/file`}
                    onPlay={() => setPlayingId(audioFile.id)}
                    onPause={() => setPlayingId(null)}
                    onEnded={() => setPlayingId(null)}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute"
                    onClick={() => {
                      const audio = document.getElementById(`audio-${audioFile.id}`) as HTMLAudioElement;
                      if (playingId === audioFile.id) {
                        audio.pause();
                      } else {
                        // Pause all other audio
                        document.querySelectorAll('audio').forEach(a => a.pause());
                        audio.play();
                      }
                    }}
                  >
                    {playingId === audioFile.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {audioFile.audioGeneration?.audioBatchPrompt?.promptText || 'Audio Generation'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {audioFile.fileName}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {formatDuration(audioFile.duration)}
                    </Badge>
                  </div>

                  {audioFile.audioGeneration?.audioBatch && (
                    <Link href={`/audio-batches/${audioFile.audioGeneration.audioBatch.id}`}>
                      <p className="text-xs text-muted-foreground hover:underline truncate">
                        Batch: {audioFile.audioGeneration.audioBatch.name}
                      </p>
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleFavorite(audioFile)}
                  >
                    <Heart
                      className={`h-4 w-4 ${audioFile.isFavorite ? 'fill-red-500 text-red-500' : ''
                        }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(audioFile)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 transition-colors ${copiedId === audioFile.id ? 'text-green-500' : ''}`}
                    onClick={() => handleCopyFileName(audioFile)}
                    title="Copy Filename"
                  >
                    {copiedId === audioFile.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
