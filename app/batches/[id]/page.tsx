"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSettings } from "@/components/providers/settings-provider";
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

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { promptStyle } = useSettings();
  
  // Custom hooks
  const { batch, loading, refetchBatch } = useBatchData(params.id);
  const { 
    images, 
    loadingImages, 
    fetchingMore, 
    hasMore, 
    lastImageElementRef,
    updateImage,
    setImages,
  } = useImageGallery(params.id, !!batch);
  
  const {
    showTransparent,
    processingTransparency,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    toggleTransparencyView,
    makeTransparent,
    setTolerance: setTransparencyTolerance,
    setMode: setTransparencyMode,
    setShowTransparent,
  } = useImageTransparency();

  // Global transparency toggle for batch page
  const [globalTransparency, setGlobalTransparency] = useState(false);
  const toggleGlobalTransparency = () => {
    const newValue = !globalTransparency;
    setGlobalTransparency(newValue);
    const newShowTransparent: Record<string, boolean> = {};
    images.forEach(image => {
      if (image.transparentFilePath) {
        newShowTransparent[image.id] = newValue;
      }
    });
    setShowTransparent(newShowTransparent);
  };

  const {
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
  } = useSquishAnimation();

  const {
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
  } = useAIAnimation();

  // Local state
  const [executing, setExecuting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Handlers
  const handleExecute = useCallback(async () => {
    setExecuting(true);
    try {
      const response = await fetch(`/api/batches/${params.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to execute batch');
      }

      alert('Batch execution started! This may take a while.');
      await refetchBatch();
    } catch (error) {
      console.error('Error executing batch:', error);
      alert('Failed to execute batch');
    } finally {
      setExecuting(false);
    }
  }, [params.id, refetchBatch]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await fetch(`/api/batches/${params.id}`, {
        method: 'DELETE',
      });
      router.push('/batches');
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
    }
  }, [params.id, router]);

  const handleCreateVersion = useCallback(async () => {
    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/batches/${params.id}/version`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create version");
      }

      const data = await response.json();
      router.push(`/batches/${data.batch.id}`);
    } catch (error) {
      console.error("Error creating version:", error);
      alert("Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  }, [params.id, router]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, image: GalleryImage) => {
    e.stopPropagation();
    const newStatus = !image.isFavorite;

    // Optimistic update
    updateImage(image.id, { isFavorite: newStatus });

    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
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
    const response = await fetch(`/api/batch-prompts/${promptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptText: newText }),
    });

    if (!response.ok) {
      throw new Error('Failed to update prompt');
    }

    await refetchBatch();
  }, [refetchBatch]);

  const handleAdjustPrompt = useCallback(async (
    promptId: string,
    suggestion: string,
    currentText: string
  ): Promise<string> => {
    const response = await fetch('/api/agents/adjust-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basePrompt: currentText,
        suggestion,
        promptStyle
      })
    });

    if (!response.ok) throw new Error('Failed to adjust prompt');
    const data = await response.json();
    return data.promptText;
  }, [promptStyle]);

  const handleGenerateSquish = useCallback(async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage
  ) => {
    e.stopPropagation();
    await generateSquishAnimation(image);
  }, [generateSquishAnimation]);

  const handleSuggestAnimation = useCallback(async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage
  ) => {
    e.stopPropagation();
    await suggestAnimation(image);
  }, [suggestAnimation]);

  const handleGenerateAIAnimation = useCallback(async (
    e: React.MouseEvent | React.KeyboardEvent,
    image: GalleryImage
  ) => {
    e.stopPropagation();
    await generateAIAnimation(image, (version) => {
      setSelectedVersion((prev) => ({ ...prev, [image.id]: version }));
    });
  }, [generateAIAnimation, setSelectedVersion]);

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
      />

      <BatchDetails batch={batch} />

      {(batch.generations.length > 0 || images.length > 0) && (
        <ImageGallery
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
        batchStatus={batch.status}
        promptStyle={promptStyle}
        onPromptUpdate={handlePromptUpdate}
        onAdjustPrompt={handleAdjustPrompt}
      />

      <ImageGalleryModal
        images={images}
        selectedIndex={selectedImageIndex}
        onClose={() => setSelectedImageIndex(null)}
        onNavigate={setSelectedImageIndex}
        onToggleFavorite={handleToggleFavorite}
        onOpenEditor={handleOpenEditor}
        onMakeTransparent={handleMakeTransparent}
        onToggleTransparencyView={handleToggleTransparencyView}
        showTransparent={showTransparent}
        processingTransparency={processingTransparency}
        transparencyTolerance={transparencyTolerance}
        onToleranceChange={setTransparencyTolerance}
        transparencyMode={transparencyMode}
        onModeChange={setTransparencyMode}
        imageVersions={imageVersions}
        processingSquish={processingSquish}
        squishIntensity={squishIntensity}
        squishFrameCount={squishFrameCount}
        squishAnimationType={squishAnimationType}
        squishAnimations={squishAnimations}
        loadingSquishAnimations={loadingSquishAnimations}
        onSquishIntensityChange={(imageId, intensity) =>
          setSquishIntensity((prev) => ({ ...prev, [imageId]: intensity }))
        }
        onSquishFrameCountChange={(imageId, count) =>
          setSquishFrameCount((prev) => ({ ...prev, [imageId]: count }))
        }
        onSquishAnimationTypeChange={(imageId, type) =>
          setSquishAnimationType((prev) => ({ ...prev, [imageId]: type }))
        }
        onGenerateSquish={handleGenerateSquish}
        onFetchSquishAnimations={fetchSquishAnimations}
        onDeleteSquishAnimation={deleteSquishAnimation}
        selectedVersion={selectedVersion}
        onSelectedVersionChange={(imageId: string, version: string) =>
          setSelectedVersion((prev) => ({ ...prev, [imageId]: version }))
        }
        processingAI={processingAI}
        suggestingPrompt={suggestingPrompt}
        aiPrompt={aiPrompt}
        aiGridSize={aiGridSize}
        aiAnimations={aiAnimations}
        loadingAIAnimations={loadingAIAnimations}
        onAIPromptChange={(imageId, prompt) =>
          setAIPrompt((prev) => ({ ...prev, [imageId]: prompt }))
        }
        onAIGridSizeChange={(imageId, size) =>
          setAIGridSize((prev) => ({ ...prev, [imageId]: size }))
        }
        onSuggestAnimation={handleSuggestAnimation}
        onGenerateAIAnimation={handleGenerateAIAnimation}
        onFetchAIAnimations={fetchAIAnimations}
        onDeleteAIAnimation={deleteAIAnimation}
      />
    </div>
  );
}
