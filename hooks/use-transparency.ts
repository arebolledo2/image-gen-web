"use client";

import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";

export function useTransparency() {
  const [globalTransparency, setGlobalTransparency] = useState(false);
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});
  const [processingTransparency, setProcessingTransparency] = useState<Record<string, boolean>>({});
  const [transparencyTolerance, setTransparencyTolerance] = useState<Record<string, number>>({});
  const [transparencyMode, setTransparencyMode] = useState<Record<string, 'global' | 'flood'>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  const toggleGlobalTransparency = useCallback((images: GalleryImage[]) => {
    const newValue = !globalTransparency;
    setGlobalTransparency(newValue);

    const newShowTransparent = { ...showTransparent };
    images.forEach(image => {
      if (image.transparentFilePath) {
        newShowTransparent[image.id] = newValue;
      }
    });
    setShowTransparent(newShowTransparent);
  }, [globalTransparency, showTransparent]);

  const toggleTransparencyView = useCallback((imageId: string) => {
    setShowTransparent(prev => ({ ...prev, [imageId]: !prev[imageId] }));
  }, []);

  const makeTransparent = useCallback(async (
    image: GalleryImage,
    samplePoint?: { x: number; y: number },
    forceOriginal?: boolean,
    onUpdate?: (imageId: string, transparentFilePath: string) => void
  ) => {
    if (processingTransparency[image.id]) {
      return;
    }

    const tolerance = transparencyTolerance[image.id] ?? 30;
    const mode = transparencyMode[image.id] ?? 'global';

    setProcessingTransparency(prev => ({ ...prev, [image.id]: true }));

    try {
      const bodyData = { tolerance, mode, samplePoint, forceOriginal };

      const response = await fetch(`/api/images/${image.id}/transparent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error('Failed to make image transparent');
      }

      const data = await response.json();

      if (data.alreadyTransparent) {
        alert(data.message || 'The selected pixel is already transparent. Please click on a visible area.');
        return;
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to make image transparent');
      }

      // Update image version to bust cache
      setImageVersions(prev => ({ ...prev, [image.id]: Date.now() }));

      // Automatically switch to transparent view
      setShowTransparent(prev => ({ ...prev, [image.id]: true }));

      // Notify parent of update
      if (onUpdate) {
        onUpdate(image.id, data.transparentFilePath);
      }
    } catch (error) {
      console.error('Error making image transparent:', error);
      alert('Failed to make image transparent');
    } finally {
      setProcessingTransparency(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingTransparency, transparencyTolerance, transparencyMode]);

  return {
    globalTransparency,
    showTransparent,
    processingTransparency,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    toggleGlobalTransparency,
    toggleTransparencyView,
    makeTransparent,
    setTransparencyTolerance,
    setTransparencyMode,
  };
}
