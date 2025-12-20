"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Trash2, ArrowLeft } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  defaults: any;
  batchPrompts: any[];
  generations: any[];
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBatch();
    }
  }, [params.id]);

  const fetchBatch = async () => {
    try {
      const response = await fetch(`/api/batches/${params.id}`);
      const data = await response.json();
      setBatch(data.batch);
    } catch (error) {
      console.error('Error fetching batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const response = await fetch(`/api/batches/${params.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to execute batch');
      }

      alert('Batch execution started! This may take a while.');
      // Refresh batch data
      await fetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      alert('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await fetch(`/api/batches/${params.id}`, {
        method: 'DELETE',
      });
      router.push('/batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
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
    return <div>Batch not found</div>;
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {batch.name}
            <Badge className={getStatusColor(batch.status)}>
              {batch.status}
            </Badge>
          </h1>
          {batch.description && (
            <p className="text-muted-foreground">{batch.description}</p>
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
              Execute Batch
            </Button>
          )}
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{new Date(batch.createdAt).toLocaleString()}</span>
            </div>
            {batch.completedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span>{new Date(batch.completedAt).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prompts:</span>
              <span>{batch.batchPrompts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Images per prompt:</span>
              <span>{batch.defaults?.count || 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total generations:</span>
              <span>{batch.generations.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generation Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Successful:</span>
              <span className="text-green-600">
                {batch.generations.filter(g => g.status === 'success').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Failed:</span>
              <span className="text-red-600">
                {batch.generations.filter(g => g.status === 'failed').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="text-gray-600">
                {batch.generations.filter(g => g.status === 'pending').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompts</CardTitle>
          <CardDescription>
            {batch.batchPrompts.length} prompt(s) in this batch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batch.batchPrompts.map((prompt, index) => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle className="text-base">Prompt {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{prompt.promptText}</p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {batch.generations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
            <CardDescription>
              {batch.generations.reduce((acc, g) => acc + (g.images?.length || 0), 0)} image(s) generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {batch.generations
                .filter(g => g.images && g.images.length > 0)
                .flatMap(g => g.images)
                .map((image) => (
                  <div key={image.id} className="aspect-square bg-muted rounded-md overflow-hidden">
                    <img
                      src={`/api/images/${image.id}/file`}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
