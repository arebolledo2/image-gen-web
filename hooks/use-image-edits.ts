"use client";

/**
 * Hook for AI image editing.
 */
import { useState, useCallback } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";
import type { ApiImageEdit } from "@/lib/types/api";

export function useImageEdits() {
  const [processingEdit, setProcessingEdit] = useState<Record<string, boolean>>({});
  const [editPrompt, setEditPrompt] = useState<Record<string, string>>({});
  const [imageEdits, setImageEdits] = useState<Record<string, ApiImageEdit[]>>({});
  const [loadingEdits, setLoadingEdits] = useState<Record<string, boolean>>({});

  const fetchImageEdits = useCallback(async (imageId: string) => {
    setLoadingEdits(prev => ({ ...prev, [imageId]: true }));
    try {
      const edits = await api.images.edits(imageId);
      setImageEdits(prev => ({ ...prev, [imageId]: edits }));
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
      const data = await api.images.aiEdit(image.id, { sourceVersion, userPrompt: prompt });

      if (!data.success) {
        throw new Error('Failed to generate AI edit');
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
      toast.error(errorMessage(error, 'Failed to generate AI edit'));
    } finally {
      setProcessingEdit(prev => ({ ...prev, [image.id]: false }));
    }
  }, [processingEdit, editPrompt, fetchImageEdits]);

  const deleteImageEdit = useCallback(async (imageId: string, editId: string) => {
    if (!confirm('Delete this edit? (This will also delete the transparent version if it exists)')) return;

    try {
      await api.images.deleteEdit(imageId, editId);

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
