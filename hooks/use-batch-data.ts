"use client";

/**
 * Hook for fetching and managing batch data.
 */
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import type { ApiBatchDetail } from "@/lib/types/api";

export function useBatchData(batchId: string | string[] | undefined) {
  const [batch, setBatch] = useState<ApiBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const requestBatch = useCallback(async (): Promise<{ ok: true; batch: ApiBatchDetail } | { ok: false } | null> => {
    if (!batchId) return null;

    try {
      const id = Array.isArray(batchId) ? batchId[0] : batchId;
      return { ok: true, batch: await api.batches.get(id) };
    } catch (error) {
      console.error('Error fetching batch:', error);
      return { ok: false };
    }
  }, [batchId]);

  const fetchBatch = useCallback(async () => {
    const result = await requestBatch();
    if (!result) return;
    if (result.ok) setBatch(result.batch);
    setLoading(false);
  }, [requestBatch]);

  useEffect(() => {
    let cancelled = false;
    requestBatch().then((result) => {
      if (cancelled || !result) return;
      if (result.ok) setBatch(result.batch);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [requestBatch]);

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
