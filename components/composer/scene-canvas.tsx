"use client";

import { useCallback, useRef } from "react";
import { SceneAsset } from "./scene-asset";
import type {
  SceneAsset as SceneAssetType,
  ComposerAction,
  BackgroundValue,
  SolidBackground,
} from "./types";
import { isSolidBackground } from "./types";

interface SceneCanvasProps {
  assets: SceneAssetType[];
  selectedAssetId: string | null;
  background: BackgroundValue;
  zoom: number;
  dispatch: React.Dispatch<ComposerAction>;
  onZoom: (zoom: number) => void;
}

const solidBackgroundStyles: Record<SolidBackground, string> = {
  checkered: "",
  black: "bg-black",
  white: "bg-white",
  gray: "bg-neutral-700",
};

const checkeredStyle = {
  backgroundImage:
    "linear-gradient(45deg, #e0e0e0 25%, transparent 25%), " +
    "linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), " +
    "linear-gradient(45deg, transparent 75%, #e0e0e0 75%), " +
    "linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
};

export function SceneCanvas({
  assets,
  selectedAssetId,
  background,
  zoom,
  dispatch,
  onZoom,
}: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const handleDeselect = useCallback(() => {
    dispatch({ type: "SELECT_ASSET", payload: null });
  }, [dispatch]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        onZoom(zoom + delta);
      }
    },
    [zoom, onZoom]
  );

  // --- Pan by dragging background ---
  const handlePanStart = useCallback(
    (e: React.PointerEvent) => {
      // Only pan when clicking directly on the canvas background (not on assets)
      if (e.target !== e.currentTarget) return;
      const container = containerRef.current;
      if (!container) return;

      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      target.style.cursor = "grabbing";
    },
    []
  );

  const handlePanMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      container.scrollLeft = panRef.current.scrollLeft - dx;
      container.scrollTop = panRef.current.scrollTop - dy;
    },
    []
  );

  const handlePanEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!panRef.current) return;
      panRef.current = null;
      (e.currentTarget as HTMLElement).style.cursor = "";
    },
    []
  );

  const isSolid = isSolidBackground(background);
  const bgClassName = isSolid ? solidBackgroundStyles[background] : "";
  const bgStyle: React.CSSProperties = {
    transform: `scale(${zoom})`,
    ...(isSolid && background === "checkered" ? checkeredStyle : {}),
    ...(!isSolid
      ? {
          backgroundImage: `url(${background.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          imageRendering: "pixelated" as const,
        }
      : {}),
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto"
      onWheel={handleWheel}
    >
      <div
        className={`relative min-w-[2000px] min-h-[2000px] origin-top-left cursor-grab ${bgClassName}`}
        style={bgStyle}
        onClick={handleDeselect}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
      >
        {assets.map((asset) => (
          <SceneAsset
            key={asset.id}
            asset={asset}
            isSelected={asset.id === selectedAssetId}
            zoom={zoom}
            dispatch={dispatch}
          />
        ))}
      </div>
    </div>
  );
}
