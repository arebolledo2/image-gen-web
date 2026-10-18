"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
import { useAIModelSettings } from "@/components/providers/ai-model-settings-provider";
import { ImageGalleryModal, type GalleryImage } from "@/components/image-gallery-modal";
import { BatchHeader } from "@/components/batch/batch-header";
import { BatchDetails } from "@/components/batch/batch-details";
import { BatchLineage } from "@/components/batch/batch-lineage";
import { BatchPromptsList } from "@/components/batch/batch-prompts-list";
import { ImageGallery } from "@/components/batch/image-gallery";
import { useBatchData } from "@/hooks/use-batch-data";
import { useImageGallery } from "@/hooks/use-image-gallery";
import { useImageTransparency } from "@/hooks/useImageTransparency";
import { useSquishAnimation } from "@/hooks/use-squish-animation";
import { useAIAnimation } from "@/hooks/use-ai-animation";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api-client";

export default function BatchDetailPage() {
  const params = useParams();
  // [id] is always present on this route; catch-all style arrays are normalised to the first segment
  const batchId = (Array.isArray(params.id) ? params.id[0] : params.id) ?? "";
  const router = useRouter();
  const { promptStyle } = useSettings();
  const { toRequestConfig } = useAIModelSettings();

  // Custom hooks
  const { batch, loading, refetchBatch } = useBatchData(params.id);
  const {
    images,
    loadingImages,
    fetchingMore,
    hasMore,
    lastImageElementRef,
    updateImage,
    refetchImages,
  } = useImageGallery(params.id, !!batch);

  // Track previous batch status to detect completion
  const prevStatusRef = useRef<string | undefined>(undefined);

  // When batch transitions from queued/running to completed, refetch images
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currentStatus = batch?.status;

    // Update ref for next comparison
    prevStatusRef.current = currentStatus;

    // Detect transition from running/queued to completed
    if (
      (prevStatus === 'queued' || prevStatus === 'running') &&
      currentStatus === 'completed'
    ) {
      refetchImages();
    }
  }, [batch?.status, refetchImages]);

  const {
    showTransparent,
    processingTransparency,
    imageVersions,
    toggleTransparencyView,
    makeTransparent,
    setShowTransparent,
  } = useImageTransparency();

  // Global transparency toggle for batch page
  const [globalTransparency, setGlobalTransparency] = useState(false);
  const toggleGlobalTransparency = useCallback(() => {
    const newValue = !globalTransparency;
    setGlobalTransparency(newValue);
    const newShowTransparent: Record<string, boolean> = {};
    images.forEach(image => {
      if (image.transparentFilePath) {
        newShowTransparent[image.id] = newValue;
      }
    });
    setShowTransparent(newShowTransparent);
  }, [globalTransparency, images, setShowTransparent]);

  const {
    squishAnimations,
    selectedVersion,
    setSelectedVersion,
    fetchSquishAnimations,
  } = useSquishAnimation();

  const {
    aiAnimations,
    fetchAIAnimations,
  } = useAIAnimation();

  // Local state
  const [executing, setExecuting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Fetch animations when modal opens
  useEffect(() => {
    if (selectedImageIndex !== null && images[selectedImageIndex]) {
      const image = images[selectedImageIndex];
      fetchSquishAnimations(image.id);
      fetchAIAnimations(image.id);
    }
  }, [selectedImageIndex, images, fetchSquishAnimations, fetchAIAnimations]);

  // Handlers
  const handleExecute = useCallback(async () => {
    setExecuting(true);
    try {
      await api.batches.execute(batchId);

      toast.success('Batch execution started! This may take a while.');
      await refetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      toast.error(errorMessage(error, 'Failed to execute batch'));
    } finally {
      setExecuting(false);
    }
  }, [batchId, refetchBatch]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await api.batches.remove(batchId);
      router.push('/batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  }, [batchId, router]);

  const handleCreateVersion = useCallback(async () => {
    setCreatingVersion(true);
    try {
      const created = await api.batches.createVersion(batchId);
      router.push(`/batches/${created.id}`);
    } catch (error) {
      console.error("Error creating version:", error);
      toast.error("Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  }, [batchId, router]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    const newStatus = !image.isFavorite;

    // Optimistic update
    updateImage(image.id, { isFavorite: newStatus });

    try {
      await api.images.setFavorite(image.id, newStatus);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      updateImage(image.id, { isFavorite: !newStatus });
    }
  }, [updateImage]);

  const handleOpenEditor = useCallback((imageId: string) => {
    router.push(`/editor/${imageId}?from=batch&batchId=${params.id}`);
  }, [router, params.id]);

  const handleMakeTransparent = useCallback(async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage,
    samplePoint?: { x: number; y: number },
    forceOriginal?: boolean
  ) => {
    await makeTransparent(e, image, samplePoint, forceOriginal, (updatedImage) => {
      updateImage(updatedImage.id, { transparentFilePath: updatedImage.transparentFilePath });
    });
  }, [makeTransparent, updateImage]);

  const handleToggleTransparencyView = useCallback((e: React.MouseEvent, imageId: string) => {
    toggleTransparencyView(e, imageId);
  }, [toggleTransparencyView]);

  const handleToggleGlobalTransparency = useCallback(() => {
    toggleGlobalTransparency();
  }, [toggleGlobalTransparency]);

  const handlePromptUpdate = useCallback(async (promptId: string, newText: string) => {
    await api.batchPrompts.updateText(promptId, newText);
    await refetchBatch();
  }, [refetchBatch]);

  const handleAdjustAllPrompts = useCallback(async (
    suggestion: string,
    referenceImageIds: string[]
  ): Promise<void> => {
    await api.agents.adjustBatchPrompts({
      batchId,
      suggestion,
      promptStyle,
      referenceImageIds,
      aiConfig: toRequestConfig(),
    });
    await refetchBatch();
    toast.success('All prompts adjusted successfully');
  }, [batchId, promptStyle, refetchBatch, toRequestConfig]);

  const handleAdjustPrompt = useCallback(async (
    promptId: string,
    suggestion: string,
    currentText: string,
    referenceImageIds: string[]
  ): Promise<string> => {
    return api.agents.adjustPrompt({
      basePrompt: currentText,
      suggestion,
      promptStyle,
      referenceImageIds,
      aiConfig: toRequestConfig(),
    });
  }, [promptStyle, toRequestConfig]);

  // Memoized values
  const totalImageCount = useMemo(() => {
    return images.length > 0
      ? images.length + (hasMore ? '+' : '')
      : batch?.generations.reduce((acc, g) => acc + (g.images?.length || 0), 0) || 0;
  }, [images.length, hasMore, batch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return <div>Batch not found</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <BatchHeader
        batch={batch}
        executing={executing}
        creatingVersion={creatingVersion}
        onExecute={handleExecute}
        onCreateVersion={handleCreateVersion}
        onDelete={handleDelete}
        onSettingsUpdated={refetchBatch}
      />

      <BatchDetails batch={batch} />

      {(batch.generations.length > 0 || images.length > 0) && (
        <ImageGallery
          prompts={batch.batchPrompts}
          images={images}
          loading={loadingImages && images.length === 0}
          fetchingMore={fetchingMore}
          hasMore={hasMore}
          totalImageCount={totalImageCount}
          globalTransparency={globalTransparency}
          showTransparent={showTransparent}
          processingTransparency={processingTransparency}
          imageVersions={imageVersions}
          lastImageElementRef={lastImageElementRef}
          onToggleGlobalTransparency={handleToggleGlobalTransparency}
          onToggleFavorite={handleToggleFavorite}
          onToggleTransparencyView={handleToggleTransparencyView}
          onMakeTransparent={handleMakeTransparent}
          onImageClick={setSelectedImageIndex}
        />
      )}

      <BatchLineage
        parentBatch={batch.parentBatch}
        childBatches={batch.childBatches}
      />

      <BatchPromptsList
        prompts={batch.batchPrompts}
        batchId={batch.id}
        batchStatus={batch.status}
        promptStyle={promptStyle}
        onPromptUpdate={handlePromptUpdate}
        onAdjustPrompt={handleAdjustPrompt}
        onAdjustAllPrompts={handleAdjustAllPrompts}
      />

      <ImageGalleryModal
        images={images}
        selectedIndex={selectedImageIndex}
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={setSelectedImageIndex}
        onToggleFavorite={handleToggleFavorite}
        onOpenEditor={handleOpenEditor}
        selectedVersion={selectedVersion}
        onSelectedVersionChange={(imageId: string, version: string) =>
          setSelectedVersion((prev) => ({ ...prev, [imageId]: version }))
        }
        squishAnimations={squishAnimations}
        aiAnimations={aiAnimations}
      />
    </div>
  );
}
