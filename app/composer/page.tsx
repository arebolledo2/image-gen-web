"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZoomIn, ZoomOut, RotateCcw, Trash2, PanelLeft, PanelRight } from "lucide-react";
import { useComposer } from "@/hooks/use-composer";
import { ComposerLayout } from "@/components/composer/composer-layout";
import { ImagePicker } from "@/components/composer/image-picker";
import { SceneCanvas } from "@/components/composer/scene-canvas";
import { AssetPanel } from "@/components/composer/asset-panel";
import type {
  SolidBackground,
  ImageBackground,
  BackgroundValue,
} from "@/components/composer/types";
import { isSolidBackground } from "@/components/composer/types";
import type { GalleryImage } from "@/components/image-gallery-modal";

const SOLID_BACKGROUNDS: { value: SolidBackground; label: string }[] = [
  { value: "checkered", label: "Checkered" },
  { value: "black", label: "Black" },
  { value: "white", label: "White" },
  { value: "gray", label: "Dark Gray" },
];

interface Category {
  id: string;
  name: string;
}

export default function ComposerPage() {
  const {
    state,
    dispatch,
    addImageToScene,
    setBackground,
    setZoom,
    clearAll,
  } = useComposer();

  const [backgroundImages, setBackgroundImages] = useState<GalleryImage[]>([]);
  const [showPicker, setShowPicker] = useState(true);
  const [showPanel, setShowPanel] = useState(true);

  // Fetch images from "backgrounds" category
  useEffect(() => {
    async function fetchBackgrounds() {
      try {
        // Find the "backgrounds" category
        const catRes = await fetch("/api/subject-categories");
        const catData = await catRes.json();
        const categories: Category[] = catData.categories || [];
        const bgCategory = categories.find(
          (c) => c.name.toLowerCase() === "backgrounds" || c.name.toLowerCase() === "background"
        );
        if (!bgCategory) return;

        // Fetch images in that category
        const url = new URL("/api/images", window.location.origin);
        url.searchParams.append("categoryId", bgCategory.id);
        url.searchParams.append("limit", "50");
        const imgRes = await fetch(url.toString());
        const imgData = await imgRes.json();
        setBackgroundImages(imgData.images || []);
      } catch (error) {
        console.error("Error fetching background images:", error);
      }
    }
    fetchBackgrounds();
  }, []);

  const zoomPercent = Math.round(state.canvasZoom * 100);

  // Serialize background to a Select-compatible string value
  function bgToSelectValue(bg: BackgroundValue): string {
    if (isSolidBackground(bg)) return bg;
    return `image:${bg.imageId}`;
  }

  function handleBackgroundChange(val: string) {
    if (val.startsWith("image:")) {
      const imageId = val.slice(6);
      const img = backgroundImages.find((i) => i.id === imageId);
      if (img) {
        const bgValue: ImageBackground = {
          type: "image",
          imageId: img.id,
          fileName: img.fileName,
          src: `/api/images/${img.id}/file`,
        };
        setBackground(bgValue);
      }
    } else {
      setBackground(val as SolidBackground);
    }
  }

  // Derive display label for the current background
  function bgDisplayLabel(): string {
    if (isSolidBackground(state.background)) {
      return SOLID_BACKGROUNDS.find((b) => b.value === state.background)?.label ?? state.background;
    }
    return state.background.fileName;
  }

  const toolbar = (
    <>
      <h1 className="font-semibold text-sm mr-4">Scene Composer</h1>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(state.canvasZoom - 0.25)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-12 text-center tabular-nums">
          {zoomPercent}%
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(state.canvasZoom + 0.25)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs ml-1"
          onClick={() => setZoom(1)}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-muted-foreground">Background:</span>
        <Select
          value={bgToSelectValue(state.background)}
          onValueChange={handleBackgroundChange}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue>{bgDisplayLabel()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs">Solid</SelectLabel>
              {SOLID_BACKGROUNDS.map((bg) => (
                <SelectItem key={bg.value} value={bg.value}>
                  {bg.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {backgroundImages.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs">Images</SelectLabel>
                {backgroundImages.map((img) => (
                  <SelectItem key={img.id} value={`image:${img.id}`}>
                    {img.fileName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant={showPicker ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowPicker((v) => !v)}
          title="Toggle image library"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={showPanel ? "secondary" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowPanel((v) => !v)}
          title="Toggle asset panel"
        >
          <PanelRight className="h-4 w-4" />
        </Button>
        {state.assets.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:text-destructive ml-1"
            onClick={clearAll}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
    </>
  );

  return (
    <ComposerLayout
      toolbar={toolbar}
      showPicker={showPicker}
      showPanel={showPanel}
      picker={<ImagePicker onAddImage={addImageToScene} />}
      canvas={
        <SceneCanvas
          assets={state.assets}
          selectedAssetId={state.selectedAssetId}
          background={state.background}
          zoom={state.canvasZoom}
          dispatch={dispatch}
          onZoom={setZoom}
        />
      }
      panel={
        <AssetPanel
          assets={state.assets}
          selectedAssetId={state.selectedAssetId}
          dispatch={dispatch}
        />
      }
    />
  );
}
