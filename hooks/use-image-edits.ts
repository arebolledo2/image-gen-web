"use client";

import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";
import { toast } from "sonner";

export function useImageEdits() {
  const [processingEdit, setProcessingEdit] = useState<Record<string, boolean>>({});
  const [editPrompt, setEditPrompt] = useState<Record<string, string>>({});
  const [imageEdits, setImageEdits] = useState<Record<string, any[]>>({});
  const [loadingEdits, setLoadingEdits] = useState<Record<string, boolean>>({});

  const fetchImageEdits = useCallback(async (imageId: string) => {
    setLoadingEdits(prev => ({ ...prev, [imageId]: true }));
    try {
      const response = await fetch(`/api/images/${imageId}/edits`);
      if (!response.ok) throw new Error('Failed to fetch edits');
      const data = await response.json();
      setImageEdits(prev => ({ ...prev, [imageId]: data.edits || [] }));
    } catch (error) {
      console.error('Error fetching image edits:', error);
    } finally {
      setLoadingEdits(prev => ({ ...prev, [imageId]: false }));
    }
  }, []);

  const generateImageEdit = useCallback(async (
    image: GalleryImage,
    sourceVersion: string,
    onVersionChange?: (version: string) => void
  ) => {
    if (processingEdit[image.id]) return;

    const prompt = editPrompt[image.id]?.trim();
    if (!prompt) {
      toast.error('Please enter edit instructions');
      return;
    }

    setProcessingEdit(prev => ({ ...prev, [image.id]: true }));

    try {
      const response = await fetch(`/api/images/${image.id}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceVersion, userPrompt: prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI edit');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI edit');
      }

      // Refresh edits list
      await fetchImageEdits(image.id);

      // Auto-select the newly created edit
      if (data.edit?.id && onVersionChange) {
        onVersionChange(`edit-${data.edit.id}`);
      }

      toast.success(`Edit "${data.edit.generatedName}" generated successfully!`);
    } catch (error) {
      console.error('Error generating AI edit:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI edit');
    } finally {
      setProcessingEdit(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingEdit, editPrompt, fetchImageEdits]);

  const deleteImageEdit = useCallback(async (imageId: string, editId: string) => {
    if (!confirm('Delete this edit? (This will also delete the transparent version if it exists)')) return;

    try {
      const response = await fetch(`/api/images/${imageId}/edits?editId=${editId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete edit');
      }

      // Refresh edits list
      await fetchImageEdits(imageId);
    } catch (error) {
      console.error('Error deleting edit:', error);
      toast.error('Failed to delete edit');
    }
  }, [fetchImageEdits]);

  return {
    processingEdit,
    editPrompt,
    imageEdits,
    loadingEdits,
    setEditPrompt,
    fetchImageEdits,
    generateImageEdit,
    deleteImageEdit,
  };
}
