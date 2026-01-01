"use client";

/**
 * Hook for fetching and managing batch data.
 * Note: Uses `any` for dynamic batch data from API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";

interface Batch {
  id: string;
  name: string;
  version: number;
  description: string | null;
  status: string;
  provider: 'gemini' | 'comfyui';
  createdAt: string;
  completedAt: string | null;
  defaults: any;
  batchPrompts: any[];
  generations: any[];
  parentBatch?: { id: string; name: string } | null;
  childBatches?: { id: string; name: string; version: number }[];
}

export function useBatchData(batchId: string | string[] | undefined) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBatch = useCallback(async () => {
    if (!batchId) return;

    try {
      const response = await fetch(`/api/batches/${batchId}`);
      const data = await response.json();
      setBatch(data.batch);
    } catch (error) {
      console.error('Error fetching batch:', error);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) {
      fetchBatch();
    }
  }, [batchId, fetchBatch]);

  const status = batch?.status;
  const currentBatchId = batch?.id;

  // Poll for updates when batch is queued or running
  useEffect(() => {
    const shouldPoll = status === 'queued' || status === 'running';

    if (!shouldPoll) return;

    const pollInterval = setInterval(() => {
      fetchBatch();
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [status, currentBatchId, fetchBatch]);

  return { batch, loading, refetchBatch: fetchBatch };
}
