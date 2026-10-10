"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  PanelLeft,
  PanelRight,
  Save,
  FolderOpen,
  X,
} from "lucide-react";
import { useComposer } from "@/hooks/use-composer";
import { ComposerLayout } from "@/components/composer/composer-layout";
import { ImagePicker } from "@/components/composer/image-picker";
import { SceneCanvas } from "@/components/composer/scene-canvas";
import { AssetPanel } from "@/components/composer/asset-panel";
import type {
  SolidBackground,
  ImageBackground,
  BackgroundValue,
  SceneAsset,
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

interface SavedLayout {
  id: string;
  name: string;
  data: {
    assets: SceneAsset[];
    background: BackgroundValue;
  };
  createdAt: string;
  updatedAt: string;
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

  // Layout save/load state
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch images from "backgrounds" category
  useEffect(() => {
    async function fetchBackgrounds() {
      try {
        const catRes = await fetch("/api/subject-categories");
        const catData = await catRes.json();
        const categories: Category[] = catData.categories || [];
        const bgCategory = categories.find(
          (c) => c.name.toLowerCase() === "backgrounds" || c.name.toLowerCase() === "background"
        );
        if (!bgCategory) return;

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

  // Fetch saved layouts
  const loadLayouts = useCallback(async (): Promise<SavedLayout[] | null> => {
    try {
      const res = await fetch("/api/composer-layouts");
      const data = await res.json();
      return data.layouts || [];
    } catch (error) {
      console.error("Error fetching layouts:", error);
      return null;
    }
  }, []);

  const fetchLayouts = useCallback(async () => {
    const layouts = await loadLayouts();
    if (layouts) setSavedLayouts(layouts);
  }, [loadLayouts]);

  useEffect(() => {
    let cancelled = false;
    loadLayouts().then((layouts) => {
      if (!cancelled && layouts) setSavedLayouts(layouts);
    });
    return () => {
      cancelled = true;
    };
  }, [loadLayouts]);

  const zoomPercent = Math.round(state.canvasZoom * 100);

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

  function bgDisplayLabel(): string {
    if (isSolidBackground(state.background)) {
      return SOLID_BACKGROUNDS.find((b) => b.value === state.background)?.label ?? state.background;
    }
    return state.background.fileName;
  }

  // Save layout
  function handleSaveClick() {
    if (currentLayoutId && !saveAsNew) {
      // Overwrite existing
      handleSave(currentLayoutName || "");
    } else {
      // Open dialog for new name
      setSaveName(currentLayoutName || "");
      setSaveAsNew(false);
      setSaveDialogOpen(true);
    }
  }

  function handleSaveAsNewClick() {
    setSaveName("");
    setSaveAsNew(true);
    setSaveDialogOpen(true);
  }

  async function handleSave(name: string) {
    setSaving(true);
    const layoutData = {
      assets: state.assets,
      background: state.background,
    };

    try {
      if (currentLayoutId && !saveAsNew) {
        // Update existing
        const res = await fetch(`/api/composer-layouts/${currentLayoutId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, data: layoutData }),
        });
        const data = await res.json();
        setCurrentLayoutName(data.layout.name);
      } else {
        // Create new
        const res = await fetch("/api/composer-layouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, data: layoutData }),
        });
        const data = await res.json();
        setCurrentLayoutId(data.layout.id);
        setCurrentLayoutName(data.layout.name);
      }
      await fetchLayouts();
      setSaveDialogOpen(false);
      setSaveAsNew(false);
    } catch (error) {
      console.error("Error saving layout:", error);
    } finally {
      setSaving(false);
    }
  }

  // Load layout
  function handleLoadLayout(layout: SavedLayout) {
    dispatch({
      type: "LOAD_LAYOUT",
      payload: {
        assets: layout.data.assets,
        background: layout.data.background,
      },
    });
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
  }

  // Delete layout
  async function handleDeleteLayout(id: string) {
    try {
      await fetch(`/api/composer-layouts/${id}`, { method: "DELETE" });
      if (currentLayoutId === id) {
        setCurrentLayoutId(null);
        setCurrentLayoutName(null);
      }
      await fetchLayouts();
    } catch (error) {
      console.error("Error deleting layout:", error);
    }
  }

  const toolbar = (
    <>
      <h1 className="font-semibold text-sm mr-4">
        Scene Composer
        {currentLayoutName && (
          <span className="font-normal text-muted-foreground ml-2">
            — {currentLayoutName}
          </span>
        )}
      </h1>

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
        {/* Save layout */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={handleSaveClick}
          disabled={state.assets.length === 0}
          title={currentLayoutId ? `Save "${currentLayoutName}"` : "Save layout"}
        >
          <Save className="h-3 w-3 mr-1" />
          Save
        </Button>

        {/* Save As New (only when editing an existing layout) */}
        {currentLayoutId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSaveAsNewClick}
            disabled={state.assets.length === 0}
            title="Save as new layout"
          >
            Save As
          </Button>
        )}

        {/* Load layout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              title="Load layout"
            >
              <FolderOpen className="h-3 w-3 mr-1" />
              Load
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {savedLayouts.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                No saved layouts
              </div>
            ) : (
              savedLayouts.map((layout) => (
                <DropdownMenuItem
                  key={layout.id}
                  className="flex items-center justify-between gap-2"
                  onSelect={(e) => {
                    // Prevent closing when clicking delete
                    if ((e.target as HTMLElement).closest("[data-delete]")) {
                      e.preventDefault();
                      return;
                    }
                    handleLoadLayout(layout);
                  }}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{layout.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {layout.data.assets.length} asset{layout.data.assets.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <Button
                    data-delete
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayout(layout.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))
            )}
            {savedLayouts.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-xs text-muted-foreground text-center">
                  {savedLayouts.length} layout{savedLayouts.length !== 1 ? "s" : ""}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
            onClick={() => {
              clearAll();
              setCurrentLayoutId(null);
              setCurrentLayoutName(null);
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>
    </>
  );

  return (
    <>
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

      {/* Save layout dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {saveAsNew ? "Save As New Layout" : "Save Layout"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Layout name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && saveName.trim()) {
                  handleSave(saveName.trim());
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(saveName.trim())}
              disabled={!saveName.trim() || saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
