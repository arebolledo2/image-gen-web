"use client";

import { useReducer, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import type {
  SceneAsset,
  ComposerState,
  ComposerAction,
  BackgroundValue,
} from "@/components/composer/types";
import type { GalleryImage } from "@/components/image-gallery-modal";

const initialState: ComposerState = {
  assets: [],
  selectedAssetId: null,
  background: "checkered",
  canvasZoom: 1,
};

function composerReducer(
  state: ComposerState,
  action: ComposerAction
): ComposerState {
  switch (action.type) {
    case "ADD_ASSET":
      return { ...state, assets: [...state.assets, action.payload] };

    case "REMOVE_ASSET":
      return {
        ...state,
        assets: state.assets.filter((a) => a.id !== action.payload),
        selectedAssetId:
          state.selectedAssetId === action.payload
            ? null
            : state.selectedAssetId,
      };

    case "UPDATE_ASSET":
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };

    case "SELECT_ASSET":
      return { ...state, selectedAssetId: action.payload };

    case "BRING_TO_FRONT": {
      const maxZ = Math.max(...state.assets.map((a) => a.zIndex), 0);
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === action.payload ? { ...a, zIndex: maxZ + 1 } : a
        ),
      };
    }

    case "SEND_TO_BACK": {
      const minZ = Math.min(...state.assets.map((a) => a.zIndex), 0);
      return {
        ...state,
        assets: state.assets.map((a) =>
          a.id === action.payload ? { ...a, zIndex: minZ - 1 } : a
        ),
      };
    }

    case "SET_BACKGROUND":
      return { ...state, background: action.payload };

    case "SET_ZOOM":
      return {
        ...state,
        canvasZoom: Math.max(0.25, Math.min(4, action.payload)),
      };

    case "CLEAR_ALL":
      return { ...initialState };

    default:
      return state;
  }
}

export function useComposer() {
  const [state, dispatch] = useReducer(composerReducer, initialState);

  const selectedAsset = state.assets.find(
    (a) => a.id === state.selectedAssetId
  );

  const addImageToScene = useCallback(
    (image: GalleryImage) => {
      const src = image.transparentFilePath
        ? `/api/images/${image.id}/file?version=transparent`
        : `/api/images/${image.id}/file`;

      // Load image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        const asset: SceneAsset = {
          id: nanoid(),
          imageId: image.id,
          fileName: image.fileName,
          src,
          x: 100 + state.assets.length * 20,
          y: 100 + state.assets.length * 20,
          width: Math.round(img.naturalWidth * 0.3),
          height: Math.round(img.naturalHeight * 0.3),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          zIndex: state.assets.length,
        };
        dispatch({ type: "ADD_ASSET", payload: asset });
      };
      img.src = src;
    },
    [state.assets.length]
  );

  const removeSelected = useCallback(() => {
    if (state.selectedAssetId) {
      dispatch({ type: "REMOVE_ASSET", payload: state.selectedAssetId });
    }
  }, [state.selectedAssetId]);

  const nudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedAsset) return;
      dispatch({
        type: "UPDATE_ASSET",
        payload: {
          id: selectedAsset.id,
          x: selectedAsset.x + dx,
          y: selectedAsset.y + dy,
        },
      });
    },
    [selectedAsset]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const shift = e.shiftKey;
      const step = shift ? 10 : 1;

      switch (e.key) {
        case "Delete":
        case "Backspace":
          e.preventDefault();
          removeSelected();
          break;
        case "Escape":
          dispatch({ type: "SELECT_ASSET", payload: null });
          break;
        case "ArrowUp":
          e.preventDefault();
          nudgeSelected(0, -step);
          break;
        case "ArrowDown":
          e.preventDefault();
          nudgeSelected(0, step);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nudgeSelected(-step, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          nudgeSelected(step, 0);
          break;
        case "]":
          if (state.selectedAssetId) {
            dispatch({
              type: "BRING_TO_FRONT",
              payload: state.selectedAssetId,
            });
          }
          break;
        case "[":
          if (state.selectedAssetId) {
            dispatch({
              type: "SEND_TO_BACK",
              payload: state.selectedAssetId,
            });
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [removeSelected, nudgeSelected, state.selectedAssetId]);

  return {
    state,
    dispatch,
    selectedAsset,
    addImageToScene,
    removeSelected,
    setBackground: (bg: BackgroundValue) =>
      dispatch({ type: "SET_BACKGROUND", payload: bg }),
    setZoom: (zoom: number) => dispatch({ type: "SET_ZOOM", payload: zoom }),
    clearAll: () => dispatch({ type: "CLEAR_ALL" }),
  };
}
