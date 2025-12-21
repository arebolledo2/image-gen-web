import { ImageProvider } from './types';
import { GeminiProvider } from './gemini/gemini-provider';
import { Gemini3Provider } from './gemini3/gemini3-provider';
import { ComfyUIProvider } from './comfyui/comfyui-provider';

export function getProvider(providerName: 'gemini' | 'gemini3' | 'comfyui'): ImageProvider {
  switch (providerName) {
    case 'gemini':
      return new GeminiProvider();
    case 'gemini3':
      return new Gemini3Provider();
    case 'comfyui':
      return new ComfyUIProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
