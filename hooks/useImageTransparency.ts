import { useState } from 'react';
import type { GalleryImage } from '@/components/image-gallery-modal';

export function useImageTransparency() {
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});
  const [processingTransparency, setProcessingTransparency] = useState<Record<string, boolean>>({});
  const [transparencyTolerance, setTransparencyTolerance] = useState<Record<string, number>>({});
  const [transparencyMode, setTransparencyMode] = useState<Record<string, 'global' | 'flood'>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  const makeTransparent = async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage,
    samplePoint?: { x: number, y: number },
    forceOriginal?: boolean,
    onSuccess?: (updatedImage: GalleryImage) => void
  ) => {
    e.stopPropagation();
    if (processingTransparency[image.id]) return;

    const tolerance = transparencyTolerance[image.id] ?? 30;
    const mode = transparencyMode[image.id] ?? 'global';

    setProcessingTransparency(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/transparent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerance, mode, samplePoint, forceOriginal }),
      });

      if (!response.ok) {
        throw new Error('Failed to make image transparent');
      }

      const data = await response.json();

      // Handle the case where user clicked on transparent pixel
      if (data.alreadyTransparent) {
        alert(data.message || 'The selected pixel is already transparent. Please click on a visible area.');
        return;
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to make image transparent');
      }

      // Update version to bust cache
      setImageVersions(prev => ({ ...prev, [image.id]: Date.now() }));

      // Automatically switch to transparent view
      setShowTransparent(prev => ({ ...prev, [image.id]: true }));

      // Call success callback with updated image
      if (onSuccess) {
        onSuccess({
          ...image,
          transparentFilePath: data.transparentFilePath
        });
      }
    } catch (error) {
      console.error('Error making image transparent:', error);
      alert('Failed to make image transparent');
    } finally {
      setProcessingTransparency(prev => ({ ...prev, [image.id]: false }));
    }
  };

  const toggleTransparencyView = (e: React.MouseEvent, imageId: string) => {
    e.stopPropagation();
    setShowTransparent(prev => ({ ...prev, [imageId]: !prev[imageId] }));
  };

  const setTolerance = (imageId: string, tolerance: number) => {
    setTransparencyTolerance(prev => ({ ...prev, [imageId]: tolerance }));
  };

  const setMode = (imageId: string, mode: 'global' | 'flood') => {
    setTransparencyMode(prev => ({ ...prev, [imageId]: mode }));
  };

  return {
    showTransparent,
    processingTransparency,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    makeTransparent,
    toggleTransparencyView,
    setTolerance,
    setMode,
    setShowTransparent,
  };
}
