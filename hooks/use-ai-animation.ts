"use client";

import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";
import { toast } from "sonner";

export function useAIAnimation() {
  const [processingAI, setProcessingAI] = useState<Record<string, boolean>>({});
  const [suggestingPrompt, setSuggestingPrompt] = useState<Record<string, boolean>>({});
  const [aiPrompt, setAIPrompt] = useState<Record<string, string>>({});
  const [aiGridSize, setAIGridSize] = useState<Record<string, 2 | 3 | 4>>({});
  const [aiAnimations, setAIAnimations] = useState<Record<string, any[]>>({});
  const [loadingAIAnimations, setLoadingAIAnimations] = useState<Record<string, boolean>>({});

  const fetchAIAnimations = useCallback(async (imageId: string) => {
    setLoadingAIAnimations(prev => ({ ...prev, [imageId]: true }));
    try {
      const response = await fetch(`/api/images/${imageId}/squish`);
      if (!response.ok) throw new Error('Failed to fetch animations');
      const data = await response.json();
      // Filter for AI-generated animations
      const aiOnly = (data.animations || []).filter((anim: any) => anim.generatedBy === 'ai');
      setAIAnimations(prev => ({ ...prev, [imageId]: aiOnly }));
    } catch (error) {
      console.error('Error fetching AI animations:', error);
    } finally {
      setLoadingAIAnimations(prev => ({ ...prev, [imageId]: false }));
    }
  }, []);

  const suggestAnimation = useCallback(async (image: GalleryImage) => {
    if (suggestingPrompt[image.id]) return;

    setSuggestingPrompt(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/suggest-animation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to suggest animation');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to suggest animation');
      }

      setAIPrompt(prev => ({ ...prev, [image.id]: data.suggestion || '' }));
    } catch (error) {
      console.error('Error suggesting animation:', error);
      toast.error('Failed to suggest animation');
    } finally {
      setSuggestingPrompt(prev => ({ ...prev, [image.id]: false }));
    }
  }, [suggestingPrompt]);

  const generateAIAnimation = useCallback(async (image: GalleryImage, onVersionChange?: (version: string) => void) => {
    if (processingAI[image.id]) return;

    const prompt = aiPrompt[image.id]?.trim();
    if (!prompt) {
      toast.error('Please enter an animation description');
      return;
    }

    const gridSize = aiGridSize[image.id] ?? 2;

    setProcessingAI(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/ai-animation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, gridSize }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI animation');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI animation');
      }

      // Refresh animations list
      await fetchAIAnimations(image.id);

      // Auto-select the newly created animation
      if (data.animation?.id && onVersionChange) {
        onVersionChange(`ai-${data.animation.id}`);
      }

      toast.success('AI animation generated successfully!');
    } catch (error) {
      console.error('Error generating AI animation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI animation');
    } finally {
      setProcessingAI(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingAI, aiPrompt, aiGridSize, fetchAIAnimations]);

  const deleteAIAnimation = useCallback(async (imageId: string, animationId: string) => {
    if (!confirm('Delete this AI animation?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}/squish?animationId=${animationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete AI animation');
      }

      // Refresh animations list
      await fetchAIAnimations(imageId);
    } catch (error) {
      console.error('Error deleting AI animation:', error);
      toast.error('Failed to delete AI animation');
    }
  }, [fetchAIAnimations]);

  return {
    processingAI,
    suggestingPrompt,
    aiPrompt,
    aiGridSize,
    aiAnimations,
    loadingAIAnimations,
    setAIPrompt,
    setAIGridSize,
    fetchAIAnimations,
    suggestAnimation,
    generateAIAnimation,
    deleteAIAnimation,
  };
}
