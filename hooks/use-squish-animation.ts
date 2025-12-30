"use client";

import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";
import { toast } from "sonner";

export function useSquishAnimation() {
  const [processingSquish, setProcessingSquish] = useState<Record<string, boolean>>({});
  const [squishIntensity, setSquishIntensity] = useState<Record<string, number>>({});
  const [squishFrameCount, setSquishFrameCount] = useState<Record<string, number>>({});
  const [squishAnimationType, setSquishAnimationType] = useState<Record<string, 'bounce' | 'squash_stretch'>>({});
  const [squishAnimations, setSquishAnimations] = useState<Record<string, any[]>>({});
  const [loadingSquishAnimations, setLoadingSquishAnimations] = useState<Record<string, boolean>>({});
  const [selectedVersion, setSelectedVersion] = useState<Record<string, string>>({});

  const fetchSquishAnimations = useCallback(async (imageId: string) => {
    setLoadingSquishAnimations(prev => ({ ...prev, [imageId]: true }));
    try {
      const response = await fetch(`/api/images/${imageId}/squish`);
      if (!response.ok) throw new Error('Failed to fetch squish animations');
      const data = await response.json();
      setSquishAnimations(prev => ({ ...prev, [imageId]: data.animations || [] }));
    } catch (error) {
      console.error('Error fetching squish animations:', error);
    } finally {
      setLoadingSquishAnimations(prev => ({ ...prev, [imageId]: false }));
    }
  }, []);

  const generateSquishAnimation = useCallback(async (image: GalleryImage) => {
    if (processingSquish[image.id]) return;

    const frameCount = squishFrameCount[image.id] ?? 8;
    const intensity = squishIntensity[image.id] ?? 20;
    const animationType = squishAnimationType[image.id] ?? 'bounce';

    setProcessingSquish(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/squish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameCount, intensity, animationType }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate squish animation');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate squish animation');
      }

      // Refresh animations list
      await fetchSquishAnimations(image.id);

      // Auto-select the newly created animation
      if (data.animation?.id) {
        setSelectedVersion(prev => ({ ...prev, [image.id]: `squish-${data.animation.id}` }));
      }

      toast.success('Squish animation generated successfully!');
    } catch (error) {
      console.error('Error generating squish animation:', error);
      toast.error('Failed to generate squish animation');
    } finally {
      setProcessingSquish(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingSquish, squishFrameCount, squishIntensity, squishAnimationType, fetchSquishAnimations]);

  const deleteSquishAnimation = useCallback(async (imageId: string, animationId: string) => {
    if (!confirm('Delete this squish animation?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}/squish?animationId=${animationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete squish animation');
      }

      // Refresh animations list
      await fetchSquishAnimations(imageId);
    } catch (error) {
      console.error('Error deleting squish animation:', error);
      toast.error('Failed to delete squish animation');
    }
  }, [fetchSquishAnimations]);

  return {
    processingSquish,
    squishIntensity,
    squishFrameCount,
    squishAnimationType,
    squishAnimations,
    loadingSquishAnimations,
    selectedVersion,
    setSquishIntensity,
    setSquishFrameCount,
    setSquishAnimationType,
    setSelectedVersion,
    fetchSquishAnimations,
    generateSquishAnimation,
    deleteSquishAnimation,
  };
}
