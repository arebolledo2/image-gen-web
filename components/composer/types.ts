export interface SceneAsset {
  id: string;
  imageId: string;
  fileName: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  zIndex: number;
}

export type SolidBackground = "checkered" | "black" | "white" | "gray";

export interface ImageBackground {
  type: "image";
  imageId: string;
  fileName: string;
  src: string;
}

export type BackgroundValue = SolidBackground | ImageBackground;

export interface ComposerState {
  assets: SceneAsset[];
  selectedAssetId: string | null;
  background: BackgroundValue;
  canvasZoom: number;
}

export type ComposerAction =
  | { type: "ADD_ASSET"; payload: SceneAsset }
  | { type: "REMOVE_ASSET"; payload: string }
  | { type: "UPDATE_ASSET"; payload: { id: string } & Partial<SceneAsset> }
  | { type: "SELECT_ASSET"; payload: string | null }
  | { type: "BRING_TO_FRONT"; payload: string }
  | { type: "SEND_TO_BACK"; payload: string }
  | { type: "SET_BACKGROUND"; payload: BackgroundValue }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "CLEAR_ALL" };

export function isSolidBackground(bg: BackgroundValue): bg is SolidBackground {
  return typeof bg === "string";
}
