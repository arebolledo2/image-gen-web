export const DEFAULT_OPENROUTER_IMAGE_MODEL = 'openai/gpt-5.4-image-2';
export const OPENROUTER_IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_OPENROUTER_IMAGE_MODEL;

const OPENROUTER_API_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_TITLE = 'Image Gen Web';

export type OpenRouterImageSize = '1K' | '2K' | '4K';
export type OpenRouterAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

export interface OpenRouterImageConfig {
  aspectRatio: OpenRouterAspectRatio;
  imageSize: OpenRouterImageSize;
}

export interface OpenRouterGeneratedImage {
  buffer: Buffer;
  mediaType: string;
}

export interface OpenRouterImageResult {
  images: OpenRouterGeneratedImage[];
  content?: string | null;
  model?: string;
  usage?: unknown;
}

interface OpenRouterImageEntry {
  image_url?: {
    url?: string;
  };
}

interface OpenRouterChoice {
  message?: {
    content?: string | null;
    images?: OpenRouterImageEntry[];
  };
}

interface OpenRouterChatResponse {
  choices?: OpenRouterChoice[];
  model?: string;
  usage?: unknown;
  error?: {
    message?: string;
  };
}

export function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return apiKey;
}

export function parseOpenRouterDataUrl(dataUrl: string): OpenRouterGeneratedImage {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('OpenRouter image generation failed: unsupported image URL format');
  }

  return {
    mediaType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export async function testOpenRouterImageConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENROUTER_API_BASE_URL}/models?output_modalities=image`, {
      headers: buildOpenRouterHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('OpenRouter image connection test failed:', error);
    return false;
  }
}

export async function generateOpenRouterImage(options: {
  prompt: string;
  imageConfig: OpenRouterImageConfig;
}): Promise<OpenRouterImageResult> {
  const response = await fetch(`${OPENROUTER_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      ...buildOpenRouterHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_IMAGE_MODEL,
      messages: [{ role: 'user', content: options.prompt }],
      modalities: ['image', 'text'],
      stream: false,
      image_config: {
        aspect_ratio: options.imageConfig.aspectRatio,
        image_size: options.imageConfig.imageSize,
      },
    }),
  });

  return parseOpenRouterImageResponse(response);
}

function buildOpenRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    'X-OpenRouter-Title': OPENROUTER_APP_TITLE,
  };

  if (process.env.NEXT_PUBLIC_APP_URL) {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL;
  }

  return headers;
}

async function parseOpenRouterImageResponse(response: Response): Promise<OpenRouterImageResult> {
  const result = await response.json().catch(() => ({})) as OpenRouterChatResponse;

  if (!response.ok) {
    throw new Error(`OpenRouter image generation failed: ${result.error?.message || response.statusText}`);
  }

  const choice = result.choices?.[0];
  const dataUrls = choice?.message?.images
    ?.map((image) => image.image_url?.url)
    .filter((url): url is string => Boolean(url)) || [];

  if (dataUrls.length === 0) {
    throw new Error('OpenRouter image generation failed: no images returned. Verify the model supports image output, modalities include image, and OPENROUTER_API_KEY has access.');
  }

  return {
    images: dataUrls.map(parseOpenRouterDataUrl),
    content: choice?.message?.content,
    model: result.model,
    usage: result.usage,
  };
}
