"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Trash2, ArrowLeft, Copy } from "lucide-react";
import { memo } from "react";
import { BatchSettingsDialog } from "./batch-settings-dialog";
import type { ProviderType } from "@/lib/config/resolution-presets";

interface BatchHeaderProps {
  batch: {
    id: string;
    name: string;
    version: number;
    description: string | null;
    status: string;
    provider: ProviderType;
    defaults?: {
      count?: number;
      resolution?: string;
    } | null;
  };
  executing: boolean;
  creatingVersion: boolean;
  onExecute: () => Promise<void>;
  onCreateVersion: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSettingsUpdated?: () => void;
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

export const BatchHeader = memo(function BatchHeader({
  batch,
  executing,
  creatingVersion,
  onExecute,
  onCreateVersion,
  onDelete,
  onSettingsUpdated,
}: BatchHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="icon" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
          <Badge variant="outline">v{batch.version}</Badge>
          <Badge className={getStatusColor(batch.status)}>
            {batch.status}
          </Badge>
        </div>
        {batch.description && (
          <p className="text-muted-foreground">{batch.description}</p>
        )}
      </div>
      <div className="flex gap-2">
        {batch.status === 'draft' && (
          <>
            <BatchSettingsDialog
              batchId={batch.id}
              currentSettings={{
                provider: batch.provider,
                defaults: batch.defaults,
              }}
              onSettingsUpdated={onSettingsUpdated || (() => router.refresh())}
            />
            <Button onClick={onExecute} disabled={executing}>
              {executing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Execute Batch
            </Button>
          </>
        )}
        <Button onClick={onCreateVersion} disabled={creatingVersion}>
          {creatingVersion ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Create Version
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
});
