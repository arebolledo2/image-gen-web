export type ProviderType = 'openai' | 'gemini' | 'gemini3' | 'comfyui';

export type ResolutionPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  geminiImageSize: '1K' | '2K' | '4K';
  category: 'square' | 'portrait' | 'landscape';
  /** Which providers support this resolution */
  supportedProviders: ProviderType[];
};

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  // Square - 1K resolutions work with all providers
  { id: '512x512', label: '512×512 (Square)', width: 512, height: 512, aspectRatio: '1:1', geminiImageSize: '1K', category: 'square', supportedProviders: ['gemini', 'gemini3', 'comfyui'] },
  { id: '1024x1024', label: '1024×1024 (Square)', width: 1024, height: 1024, aspectRatio: '1:1', geminiImageSize: '1K', category: 'square', supportedProviders: ['openai', 'gemini', 'gemini3', 'comfyui'] },
  // 2K/4K only supported by gemini3 and comfyui (gemini 2.5 flash only supports 1K)
  { id: '2048x2048', label: '2048×2048 (Square 2K)', width: 2048, height: 2048, aspectRatio: '1:1', geminiImageSize: '2K', category: 'square', supportedProviders: ['gemini3', 'comfyui'] },
  { id: '4096x4096', label: '4096×4096 (Square 4K)', width: 4096, height: 4096, aspectRatio: '1:1', geminiImageSize: '4K', category: 'square', supportedProviders: ['gemini3', 'comfyui'] },

  // Portrait - 1K resolutions work with all providers
  { id: '512x768', label: '512×768 (Portrait 2:3)', width: 512, height: 768, aspectRatio: '2:3', geminiImageSize: '1K', category: 'portrait', supportedProviders: ['gemini', 'gemini3', 'comfyui'] },
  { id: '768x1024', label: '768×1024 (Portrait 3:4)', width: 768, height: 1024, aspectRatio: '3:4', geminiImageSize: '1K', category: 'portrait', supportedProviders: ['gemini', 'gemini3', 'comfyui'] },
  // 2K/4K only supported by gemini3 and comfyui
  { id: '1024x1536', label: '1024×1536 (Portrait 2K 2:3)', width: 1024, height: 1536, aspectRatio: '2:3', geminiImageSize: '2K', category: 'portrait', supportedProviders: ['openai', 'gemini3', 'comfyui'] },
  { id: '2048x3072', label: '2048×3072 (Portrait 4K 2:3)', width: 2048, height: 3072, aspectRatio: '2:3', geminiImageSize: '4K', category: 'portrait', supportedProviders: ['gemini3', 'comfyui'] },

  // Landscape - 1K resolutions work with all providers
  { id: '768x512', label: '768×512 (Landscape 3:2)', width: 768, height: 512, aspectRatio: '3:2', geminiImageSize: '1K', category: 'landscape', supportedProviders: ['gemini', 'gemini3', 'comfyui'] },
  { id: '1024x768', label: '1024×768 (Landscape 4:3)', width: 1024, height: 768, aspectRatio: '4:3', geminiImageSize: '1K', category: 'landscape', supportedProviders: ['gemini', 'gemini3', 'comfyui'] },
  // 2K/4K only supported by gemini3 and comfyui
  { id: '1536x1024', label: '1536×1024 (Landscape 2K 3:2)', width: 1536, height: 1024, aspectRatio: '3:2', geminiImageSize: '2K', category: 'landscape', supportedProviders: ['openai', 'gemini3', 'comfyui'] },
  { id: '3072x2048', label: '3072x2048 (Landscape 4K 3:2)', width: 3072, height: 2048, aspectRatio: '3:2', geminiImageSize: '4K', category: 'landscape', supportedProviders: ['gemini3', 'comfyui'] },
  { id: '3840x2160', label: '3840x2160 (Landscape 4K 16:9)', width: 3840, height: 2160, aspectRatio: '16:9', geminiImageSize: '4K', category: 'landscape', supportedProviders: ['gemini3', 'comfyui'] },
];

export const DEFAULT_RESOLUTION = '1024x1024';

export function getResolutionPreset(id: string): ResolutionPreset | undefined {
  return RESOLUTION_PRESETS.find(preset => preset.id === id);
}

export function getResolutionPresetsForProvider(provider: ProviderType): ResolutionPreset[] {
  return RESOLUTION_PRESETS.filter(preset => preset.supportedProviders.includes(provider));
}
