"use client";

/**
 * Hook for AI animation generation.
 */
import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import type { ApiSquishAnimation } from "@/lib/types/api";

export function useAIAnimation() {
  const [processingAI, setProcessingAI] = useState<Record<string, boolean>>({});
  const [suggestingPrompt, setSuggestingPrompt] = useState<Record<string, boolean>>({});
  const [aiPrompt, setAIPrompt] = useState<Record<string, string>>({});
  const [aiGridSize, setAIGridSize] = useState<Record<string, 2 | 3 | 4>>({});
  const [aiAnimations, setAIAnimations] = useState<Record<string, ApiSquishAnimation[]>>({});
  const [loadingAIAnimations, setLoadingAIAnimations] = useState<Record<string, boolean>>({});

  const fetchAIAnimations = useCallback(async (imageId: string) => {
    setLoadingAIAnimations(prev => ({ ...prev, [imageId]: true }));
    try {
      const animations = await api.images.squishAnimations(imageId);
      // Filter for AI-generated animations
      const aiOnly = animations.filter((anim) => anim.generatedBy === 'ai');
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
      const suggestion = await api.images.suggestAnimation(image.id);
      setAIPrompt(prev => ({ ...prev, [image.id]: suggestion || '' }));
    } catch (error) {
      console.error('Error suggesting animation:', error);
      toast.error(errorMessage(error, 'Failed to suggest animation'));
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
      const data = await api.images.createAiAnimation(image.id, { prompt, gridSize });

      if (!data.success) {
        throw new Error('Failed to generate AI animation');
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
      toast.error(errorMessage(error, 'Failed to generate AI animation'));
    } finally {
      setProcessingAI(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingAI, aiPrompt, aiGridSize, fetchAIAnimations]);

  const deleteAIAnimation = useCallback(async (imageId: string, animationId: string) => {
    if (!confirm('Delete this AI animation?')) return;

    try {
      await api.images.deleteAnimation(imageId, animationId);

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
