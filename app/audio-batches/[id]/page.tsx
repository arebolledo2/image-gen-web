"use client";

import { use, useState, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Music, ArrowLeft, Trash2, Edit2, Check, X, Copy } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { useAudioBatchData } from "@/hooks/use-audio-batch-data";

export default function AudioBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { batch, loading, refetchBatch } = useAudioBatchData(resolvedParams.id);
  const [executing, setExecuting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit states
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const handleExecute = async () => {
    if (!batch) return;

    setExecuting(true);
    try {
      const response = await fetch(`/api/audio-batches/${batch.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to execute batch');

      toast.success('Audio batch queued for execution!');
      refetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      toast.error('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!batch) return;

    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/audio-batches/${batch.id}/version`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to create version');

      const data = await response.json();
      toast.success('New version created!');
      router.push(`/audio-batches/${data.audioBatch.id}`);
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
    } finally {
      setCreatingVersion(false);
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
      toast.error('Failed to delete batch');
      setDeleting(false);
    }
  };

  const handleEditPrompt = (prompt: { id: string, promptText: string }) => {
    setEditingPromptId(prompt.id);
    setEditPromptText(prompt.promptText);
  };

  const handleSavePrompt = async (promptId: string) => {
    setSavingPrompt(true);
    try {
      const response = await fetch(`/api/audio-batch-prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: editPromptText }),
      });

      if (!response.ok) throw new Error('Failed to update prompt');

      setEditingPromptId(null);
      toast.success('Prompt updated');
      refetchBatch();
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleAdjustPrompt = useCallback(async (
    promptId: string,
    suggestion: string,
    currentText: string
  ): Promise<string> => {
    const response = await fetch('/api/agents/adjust-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basePrompt: currentText,
        suggestion,
        promptStyle: "audio" // Specific style for audio
      })
    });

    if (!response.ok) throw new Error('Failed to adjust prompt');
    const data = await response.json();
    setEditPromptText(data.promptText);
    return data.promptText;
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white border-0';
      case 'running':
        return 'bg-blue-500 text-white border-0';
      case 'failed':
        return 'bg-red-500 text-white border-0';
      case 'queued':
        return 'bg-yellow-500 text-white border-0';
      case 'draft':
        return 'bg-gray-500 text-white border-0';
      default:
        return 'bg-gray-500 text-white border-0';
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/audio-batches')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
            <Badge variant="outline">v{batch.version}</Badge>
            <Badge className={getStatusColor(batch.status)}>
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
          <Button onClick={handleCreateVersion} disabled={creatingVersion} variant="outline">
            {creatingVersion ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Create Version
          </Button>
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
        <CardContent className="space-y-4">
          {batch.audioBatchPrompts.map((prompt, index) => (
            <Card key={prompt.id} className="overflow-hidden border-muted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/30">
                <CardTitle className="text-base">Prompt {index + 1}</CardTitle>
                {batch.status === 'draft' && editingPromptId !== prompt.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditPrompt(prompt)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {editingPromptId === prompt.id ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <AIAssistButton
                        label="AI Adjust"
                        title="Adjust Prompt"
                        description="Make a quick suggestion to adjust this audio prompt."
                        placeholder="e.g., make it more atmospheric, add more bass..."
                        onGenerate={async (suggestion) => {
                          await handleAdjustPrompt(prompt.id, suggestion, editPromptText);
                        }}
                      />
                    </div>
                    <Textarea
                      value={editPromptText}
                      onChange={(e) => setEditPromptText(e.target.value)}
                      className="min-h-[100px] text-sm"
                      placeholder="Enter audio prompt description..."
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingPromptId(null)}
                        disabled={savingPrompt}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSavePrompt(prompt.id)}
                        disabled={savingPrompt}
                      >
                        {savingPrompt ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{prompt.promptText}</p>
                )}
              </CardContent>
            </Card>
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
