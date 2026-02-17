"use client";

import { useCallback, useRef } from "react";
import type { SceneAsset as SceneAssetType, ComposerAction } from "./types";

interface SceneAssetProps {
  asset: SceneAssetType;
  isSelected: boolean;
  zoom: number;
  dispatch: React.Dispatch<ComposerAction>;
}

type Corner = "nw" | "ne" | "sw" | "se";

const HANDLE_SIZE = 8;

const cursorMap: Record<Corner, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
};

export function SceneAsset({
  asset,
  isSelected,
  zoom,
  dispatch,
}: SceneAssetProps) {
  const dragRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startAssetX: number;
    startAssetY: number;
  } | null>(null);

  const resizeRef = useRef<{
    corner: Corner;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  } | null>(null);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch({ type: "SELECT_ASSET", payload: asset.id });
    },
    [dispatch, asset.id]
  );

  // --- Drag ---
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dispatch({ type: "SELECT_ASSET", payload: asset.id });

      dragRef.current = {
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startAssetX: asset.x,
        startAssetY: asset.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [dispatch, asset.id, asset.x, asset.y]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.startPointerX) / zoom;
      const dy = (e.clientY - dragRef.current.startPointerY) / zoom;
      dispatch({
        type: "UPDATE_ASSET",
        payload: {
          id: asset.id,
          x: Math.round(dragRef.current.startAssetX + dx),
          y: Math.round(dragRef.current.startAssetY + dy),
        },
      });
    },
    [dispatch, asset.id, zoom]
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // --- Resize ---
  const handleResizeStart = useCallback(
    (corner: Corner) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      resizeRef.current = {
        corner,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startX: asset.x,
        startY: asset.y,
        startWidth: asset.width,
        startHeight: asset.height,
        aspectRatio: asset.width / asset.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [asset.x, asset.y, asset.width, asset.height]
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return;
      const r = resizeRef.current;
      const dx = (e.clientX - r.startPointerX) / zoom;

      let newWidth = r.startWidth;
      let newHeight = r.startHeight;
      let newX = r.startX;
      let newY = r.startY;

      // Calculate new size based on which corner is being dragged
      // Use the axis with the larger delta to drive the resize, maintaining aspect ratio
      switch (r.corner) {
        case "se":
          newWidth = Math.max(16, r.startWidth + dx);
          newHeight = newWidth / r.aspectRatio;
          break;
        case "sw":
          newWidth = Math.max(16, r.startWidth - dx);
          newHeight = newWidth / r.aspectRatio;
          newX = r.startX + (r.startWidth - newWidth);
          break;
        case "ne":
          newWidth = Math.max(16, r.startWidth + dx);
          newHeight = newWidth / r.aspectRatio;
          newY = r.startY + (r.startHeight - newHeight);
          break;
        case "nw":
          newWidth = Math.max(16, r.startWidth - dx);
          newHeight = newWidth / r.aspectRatio;
          newX = r.startX + (r.startWidth - newWidth);
          newY = r.startY + (r.startHeight - newHeight);
          break;
      }

      dispatch({
        type: "UPDATE_ASSET",
        payload: {
          id: asset.id,
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        },
      });
    },
    [dispatch, asset.id, zoom]
  );

  const handleResizeEnd = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const corners: Corner[] = ["nw", "ne", "sw", "se"];

  return (
    <div
      className="absolute"
      style={{
        left: asset.x,
        top: asset.y,
        width: asset.width,
        height: asset.height,
        zIndex: asset.zIndex,
      }}
      onClick={handleSelect}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt={asset.fileName}
        draggable={false}
        className="w-full h-full select-none"
        style={{ imageRendering: "pixelated" }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      />

      {/* Selection outline + resize handles */}
      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

          {corners.map((corner) => {
            const isTop = corner.startsWith("n");
            const isLeft = corner.endsWith("w");
            return (
              <div
                key={corner}
                className="absolute bg-white border-2 border-blue-500"
                style={{
                  width: HANDLE_SIZE,
                  height: HANDLE_SIZE,
                  top: isTop ? -HANDLE_SIZE / 2 : "auto",
                  bottom: !isTop ? -HANDLE_SIZE / 2 : "auto",
                  left: isLeft ? -HANDLE_SIZE / 2 : "auto",
                  right: !isLeft ? -HANDLE_SIZE / 2 : "auto",
                  cursor: cursorMap[corner],
                }}
                onPointerDown={handleResizeStart(corner)}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
