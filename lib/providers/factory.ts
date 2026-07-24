import { ImageProvider, ImageProviderName } from './types';
import { GeminiProvider } from './gemini/gemini-provider';
import { Gemini3Provider } from './gemini3/gemini3-provider';
import { ComfyUIProvider } from './comfyui/comfyui-provider';
import { OpenAIProvider } from './openai/openai-provider';
import { OpenRouterProvider } from './openrouter/openrouter-provider';

export function getProvider(providerName: ImageProviderName): ImageProvider {
  switch (providerName) {
    case 'openai':
      return new OpenAIProvider();
    case 'openrouter':
      return new OpenRouterProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'gemini3':
      return new Gemini3Provider();
    case 'comfyui':
      return new ComfyUIProvider('txt2img');
    case 'comfyui-krea':
      return new ComfyUIProvider('txt2img_krea');
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}
