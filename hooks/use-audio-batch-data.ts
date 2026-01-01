"use client";

/**
 * Hook for fetching and managing audio batch data.
 * Note: Uses `any` for dynamic batch data from API.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

interface AudioBatch {
    id: string;
    name: string;
    version: number;
    description: string | null;
    status: string;
    provider: string;
    createdAt: string;
    completedAt: string | null;
    defaults: any;
    audioBatchPrompts: any[];
    audioGenerations?: any[];
    parentAudioBatch?: { id: string; name: string } | null;
    childAudioBatches?: { id: string; name: string; version: number }[];
}

export function useAudioBatchData(batchId: string | string[] | undefined) {
    const [batch, setBatch] = useState<AudioBatch | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBatch = async () => {
        if (!batchId) return;

        try {
            const response = await fetch(`/api/audio-batches/${batchId}`);
            const data = await response.json();
            setBatch(data.audioBatch);
        } catch (error) {
            console.error('Error fetching audio batch:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) {
            fetchBatch();
        }
    }, [batchId]);

    // Poll for updates when batch is queued or running
    useEffect(() => {
        if (!batch) return;

        const shouldPoll = batch.status === 'queued' || batch.status === 'running';

        if (!shouldPoll) return;

        const pollInterval = setInterval(() => {
            fetchBatch();
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(pollInterval);
    }, [batch?.status, batch?.id]);

    return { batch, loading, refetchBatch: fetchBatch };
}
