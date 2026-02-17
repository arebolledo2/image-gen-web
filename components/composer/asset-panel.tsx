"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Trash2,
  X,
} from "lucide-react";
import type { SceneAsset, ComposerAction } from "./types";

function ScaleControl({
  asset,
  onScaleChange,
}: {
  asset: SceneAsset;
  onScaleChange: (scalePercent: number) => void;
}) {
  const currentScale = Math.round(
    (asset.width / asset.naturalWidth) * 100
  );
  const [inputValue, setInputValue] = useState(currentScale.toString());

  // Sync input when scale changes externally (drag, slider)
  useEffect(() => {
    setInputValue(currentScale.toString());
  }, [currentScale]);

  function commitInput() {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 800) {
      onScaleChange(parsed);
    } else {
      setInputValue(currentScale.toString());
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs flex-shrink-0">Scale:</Label>
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitInput();
          }}
          min={10}
          max={800}
          className="h-7 w-20 text-xs text-right"
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
      <Slider
        value={[currentScale]}
        onValueChange={([val]) => onScaleChange(val)}
        min={10}
        max={800}
        step={5}
        className="w-full"
      />
    </div>
  );
}

interface AssetPanelProps {
  assets: SceneAsset[];
  selectedAssetId: string | null;
  dispatch: React.Dispatch<ComposerAction>;
}

export function AssetPanel({
  assets,
  selectedAssetId,
  dispatch,
}: AssetPanelProps) {
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  // Sort assets by zIndex descending for the list (top layer first)
  const sortedAssets = [...assets].sort((a, b) => b.zIndex - a.zIndex);

  const handleScaleChange = (assetId: string, asset: SceneAsset, scalePercent: number) => {
    const scale = scalePercent / 100;
    dispatch({
      type: "UPDATE_ASSET",
      payload: {
        id: assetId,
        width: Math.round(asset.naturalWidth * scale),
        height: Math.round(asset.naturalHeight * scale),
      },
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Scene Assets</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {assets.length} asset{assets.length !== 1 ? "s" : ""} placed
        </p>
      </div>

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto">
        {sortedAssets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8 px-3">
            Click images in the library to add them to the scene
          </p>
        ) : (
          <div className="divide-y">
            {sortedAssets.map((asset) => (
              <div
                key={asset.id}
                className={`p-2 cursor-pointer transition-colors ${
                  asset.id === selectedAssetId
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                }`}
                onClick={() =>
                  dispatch({ type: "SELECT_ASSET", payload: asset.id })
                }
              >
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 rounded border bg-muted/50 flex-shrink-0 overflow-hidden">
                    <Image
                      src={asset.src}
                      alt={asset.fileName}
                      fill
                      className="object-contain"
                      style={{ imageRendering: "pixelated" }}
                      sizes="40px"
                    />
                  </div>
                  <span className="text-xs truncate flex-1">
                    {asset.fileName}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "REMOVE_ASSET", payload: asset.id });
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected asset controls */}
      {selectedAsset && (
        <div className="border-t p-3 space-y-3">
          <h4 className="font-medium text-xs uppercase text-muted-foreground">
            Selected Asset
          </h4>

          {/* Scale */}
          <ScaleControl
            asset={selectedAsset}
            onScaleChange={(val) =>
              handleScaleChange(selectedAsset.id, selectedAsset, val)
            }
          />

          {/* Position */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>X: {selectedAsset.x}</span>
            <span>Y: {selectedAsset.y}</span>
            <span>
              {selectedAsset.width}×{selectedAsset.height}
            </span>
          </div>

          {/* Layer controls */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() =>
                dispatch({
                  type: "BRING_TO_FRONT",
                  payload: selectedAsset.id,
                })
              }
            >
              <ArrowUpToLine className="h-3 w-3 mr-1" />
              Front
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() =>
                dispatch({
                  type: "SEND_TO_BACK",
                  payload: selectedAsset.id,
                })
              }
            >
              <ArrowDownToLine className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() =>
              dispatch({ type: "REMOVE_ASSET", payload: selectedAsset.id })
            }
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
