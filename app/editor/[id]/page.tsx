"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Heart, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorLayout } from "@/components/editor/editor-layout";
import { TransparencyPanel } from "@/components/editor/transparency-panel";
import { SquishAnimationPanel } from "@/components/editor/squish-animation-panel";
import { AIAnimationPanel } from "@/components/editor/ai-animation-panel";
import { ImagePreview } from "@/components/editor/image-preview";
import { useImageTransparency } from "@/hooks/useImageTransparency";
import { useSquishAnimation } from "@/hooks/use-squish-animation";
import { useAIAnimation } from "@/hooks/use-ai-animation";
import type { GalleryImage } from "@/components/image-gallery-modal";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageId = params.id as string;

  const [image, setImage] = useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSampling, setIsSampling] = useState(false);
  const [internalVersion, setInternalVersion] = useState<number>(Date.now());

  // Get navigation context
  const from = searchParams.get('from');
  const batchId = searchParams.get('batchId');

  // Use hooks
  const {
    showTransparent,
    processingTransparency,
    transparencyTolerance,
    transparencyMode,
    imageVersions,
    makeTransparent,
    setTolerance,
    setMode,
  } = useImageTransparency();

  const {
    processingSquish,
    squishIntensity,
    squishFrameCount,
    squishAnimations,
    loadingSquishAnimations,
    selectedVersion,
    setSquishIntensity,
    setSquishFrameCount,
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

  // Fetch image data
  useEffect(() => {
    const fetchImage = async () => {
      try {
        const response = await fetch(`/api/images/${imageId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        const data = await response.json();
        setImage(data);
      } catch (error) {
        console.error('Error fetching image:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId]);

  // Fetch animations when image loads
  useEffect(() => {
    if (image) {
      fetchSquishAnimations(image.id);
      fetchAIAnimations(image.id);
    }
  }, [image?.id]);

  // Handle back navigation
  const handleBack = () => {
    if (from === 'batch' && batchId) {
      router.push(`/batches/${batchId}`);
    } else if (from === 'gallery') {
      router.push('/gallery');
    } else {
      router.back();
    }
  };

  // Handle transparency application
  const handleApplyTransparency = async () => {
    if (!image) return;
    await makeTransparent({} as React.MouseEvent, image, undefined, true, (updatedImage) => {
      setImage(updatedImage);
      setInternalVersion(Date.now());
      setSelectedVersion((prev) => ({ ...prev, [image.id]: 'transparent' }));
    });
  };

  // Handle image click for color picking
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!image || !isSampling) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const renderedWidth = rect.width;
    const renderedHeight = rect.height;
    const naturalWidth = e.currentTarget.naturalWidth;
    const naturalHeight = e.currentTarget.naturalHeight;

    const scale = Math.min(renderedWidth / naturalWidth, renderedHeight / naturalHeight);
    const actualRenderedWidth = naturalWidth * scale;
    const actualRenderedHeight = naturalHeight * scale;
    const offsetX = (renderedWidth - actualRenderedWidth) / 2;
    const offsetY = (renderedHeight - actualRenderedHeight) / 2;

    const imageX = Math.floor((x - offsetX) / scale);
    const imageY = Math.floor((y - offsetY) / scale);

    if (imageX >= 0 && imageX < naturalWidth && imageY >= 0 && imageY < naturalHeight) {
      makeTransparent({} as React.MouseEvent, image, { x: imageX, y: imageY }, false, (updatedImage) => {
        setImage(updatedImage);
        setInternalVersion(Date.now());
        setSelectedVersion((prev) => ({ ...prev, [image.id]: 'transparent' }));
      });
    }
  };

  // Handle favorite toggle
  const toggleFavorite = async () => {
    if (!image) return;

    const newStatus = !image.isFavorite;
    setImage({ ...image, isFavorite: newStatus });

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
      setImage({ ...image, isFavorite: !newStatus });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Image Not Found</h1>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentVersion = selectedVersion[image.id] || 'original';

  return (
    <EditorLayout
      onBack={handleBack}
      backLabel={from === 'batch' ? `Back to Batch` : 'Back to Gallery'}
      header={
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <h1 className="text-lg font-semibold truncate">{image.fileName}</h1>
            {image.generation.batchPrompt && (
              <p className="text-sm text-muted-foreground truncate">
                {image.generation.batchPrompt.promptText}
              </p>
            )}
          </div>

          {/* Version Selector */}
          <Select
            value={currentVersion}
            onValueChange={(value) => {
              setSelectedVersion((prev) => ({ ...prev, [image.id]: value }));
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">Original</SelectItem>
              {image.transparentFilePath && (
                <SelectItem value="transparent">Transparent</SelectItem>
              )}
              {squishAnimations[image.id]?.map((animation: any) => (
                <SelectItem key={animation.id} value={`animation-${animation.id}`}>
                  Squish - {animation.frameCount}f @ {animation.intensity}%
                </SelectItem>
              ))}
              {aiAnimations[image.id]?.map((animation: any) => (
                <SelectItem key={animation.id} value={`animation-${animation.id}`}>
                  AI - {animation.metadata?.gridSize || 2}×{animation.metadata?.gridSize || 2} ({animation.frameCount}f)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className={image.isFavorite ? 'text-red-500' : ''}
              onClick={toggleFavorite}
              title="Favorite"
            >
              <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <a
                href={
                  currentVersion.startsWith('animation-')
                    ? `/api/squish-animations/${currentVersion.replace('animation-', '')}/file`
                    : `/api/images/${image.id}/file${currentVersion === 'transparent' ? '?version=transparent' : ''}`
                }
                download={image.fileName}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      }
      sidebar={
        <>
          <TransparencyPanel
            mode={transparencyMode[image.id] || 'global'}
            tolerance={transparencyTolerance[image.id] || 30}
            processing={processingTransparency[image.id] || false}
            isSampling={isSampling}
            onModeChange={(mode) => setMode(image.id, mode)}
            onToleranceChange={(tolerance) => setTolerance(image.id, tolerance)}
            onApplyCorners={handleApplyTransparency}
            onToggleSampling={() => setIsSampling(!isSampling)}
          />

          <SquishAnimationPanel
            intensity={squishIntensity[image.id] || 20}
            frameCount={squishFrameCount[image.id] || 8}
            processing={processingSquish[image.id] || false}
            loading={loadingSquishAnimations[image.id] || false}
            animations={squishAnimations[image.id] || []}
            onIntensityChange={(intensity) =>
              setSquishIntensity((prev) => ({ ...prev, [image.id]: intensity }))
            }
            onFrameCountChange={(count) =>
              setSquishFrameCount((prev) => ({ ...prev, [image.id]: count }))
            }
            onGenerate={async () => {
              await generateSquishAnimation(image);
              await fetchSquishAnimations(image.id);
            }}
            onRefresh={() => fetchSquishAnimations(image.id)}
            onDelete={async (animationId) => {
              await deleteSquishAnimation(image.id, animationId);
              await fetchSquishAnimations(image.id);
            }}
          />

          <AIAnimationPanel
            prompt={aiPrompt[image.id] || ''}
            gridSize={aiGridSize[image.id] || 2}
            processing={processingAI[image.id] || false}
            suggesting={suggestingPrompt[image.id] || false}
            loading={loadingAIAnimations[image.id] || false}
            animations={aiAnimations[image.id] || []}
            onPromptChange={(prompt) =>
              setAIPrompt((prev) => ({ ...prev, [image.id]: prompt }))
            }
            onGridSizeChange={(size) =>
              setAIGridSize((prev) => ({ ...prev, [image.id]: size }))
            }
            onSuggest={async () => {
              await suggestAnimation(image);
            }}
            onGenerate={async () => {
              await generateAIAnimation(image, (version) => {
                setSelectedVersion((prev) => ({ ...prev, [image.id]: version }));
              });
              await fetchAIAnimations(image.id);
            }}
            onRefresh={() => fetchAIAnimations(image.id)}
            onDelete={async (animationId) => {
              await deleteAIAnimation(image.id, animationId);
              await fetchAIAnimations(image.id);
            }}
          />
        </>
      }
    >
      <ImagePreview
        imageId={image.id}
        fileName={image.fileName}
        selectedVersion={currentVersion}
        imageVersion={internalVersion}
        squishAnimations={squishAnimations[image.id] || []}
        aiAnimations={aiAnimations[image.id] || []}
        isSampling={isSampling}
        onImageClick={handleImageClick}
      />
    </EditorLayout>
  );
}
