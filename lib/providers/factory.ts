import { ImageProvider } from './types';
import { GeminiProvider } from './gemini/gemini-provider';
import { ComfyUIProvider } from './comfyui/comfyui-provider';

export function getProvider(providerName: 'gemini' | 'comfyui'): ImageProvider {
  switch (providerName) {
    case 'gemini':
      return new GeminiProvider();
    case 'comfyui':
      return new ComfyUIProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
