import { useState } from 'react';
import type { GalleryImage } from '@/components/image-gallery-modal';

export function useImageTransparency() {
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});
  const [processingTransparency, setProcessingTransparency] = useState<Record<string, boolean>>({});
  const [processingFlip, setProcessingFlip] = useState<Record<string, boolean>>({});
  const [transparencyTolerance, setTransparencyTolerance] = useState<Record<string, number>>({});
  const [transparencyMode, setTransparencyMode] = useState<Record<string, 'global' | 'flood'>>({});
  const [imageVersions, setImageVersions] = useState<Record<string, number>>({});

  const makeTransparent = async (
    e: React.MouseEvent | React.KeyboardEvent | null,
    image: GalleryImage,
    samplePoint?: { x: number, y: number },
    forceOriginal?: boolean,
    onSuccess?: (updatedImage: GalleryImage) => void,
    currentVersion?: string,
    onVersionChange?: (version: string) => void
  ) => {
    e?.stopPropagation();
    if (processingTransparency[image.id]) return;

    const tolerance = transparencyTolerance[image.id] ?? 30;
    const mode = transparencyMode[image.id] ?? 'global';

    setProcessingTransparency(prev => ({ ...prev, [image.id]: true }));

    try {
      // Detect if we're working with an edit (including transparent edits)
      const isTransparentEdit = currentVersion?.startsWith('edit-transparent-');
      const isRegularEdit = currentVersion?.startsWith('edit-') && !isTransparentEdit;
      const isEdit = isTransparentEdit || isRegularEdit;

      let editId: string | null = null;
      if (isTransparentEdit) {
        editId = currentVersion.replace('edit-transparent-', '');
      } else if (isRegularEdit) {
        editId = currentVersion.replace('edit-', '');
      }

      const endpoint = isEdit
        ? `/api/image-edits/${editId}/transparent`
        : `/api/images/${image.id}/transparent`;

      const response = await fetch(endpoint, {
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

      // If edit, switch to transparent edit version
      if (isEdit && onVersionChange && editId) {
        onVersionChange(`edit-transparent-${editId}`);
      } else {
        // Automatically switch to transparent view for regular images
        setShowTransparent(prev => ({ ...prev, [image.id]: true }));
      }

      // Call success callback with updated image
      if (onSuccess) {
        if (isEdit) {
          // For edits, the callback will refresh the edits list
          onSuccess(image);
        } else {
          onSuccess({
            ...image,
            transparentFilePath: data.transparentFilePath
          });
        }
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

  const flipHorizontal = async (
    image: GalleryImage,
    onSuccess?: (updatedImage: GalleryImage) => void
  ) => {
    if (processingFlip[image.id]) return;

    setProcessingFlip(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/flip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to flip image');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to flip image');
      }

      // Update version to bust cache
      setImageVersions(prev => ({ ...prev, [image.id]: Date.now() }));

      // Call success callback with updated image
      if (onSuccess) {
        onSuccess({
          ...image,
          flippedFilePath: data.flippedFilePath
        });
      }
    } catch (error) {
      console.error('Error flipping image:', error);
      alert('Failed to flip image');
    } finally {
      setProcessingFlip(prev => ({ ...prev, [image.id]: false }));
    }
  };

  return {
    showTransparent,
    processingTransparency,
    processingFlip,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    makeTransparent,
    flipHorizontal,
    toggleTransparencyView,
    setTolerance,
    setMode,
    setShowTransparent,
  };
}
