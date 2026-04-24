export const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;

const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';

export type OpenAIImageSize = '1024x1024' | '1024x1536' | '1536x1024';

export interface OpenAIImageResult {
  buffer: Buffer;
  mediaType: 'image/png';
  revisedPrompt?: string;
  usage?: unknown;
}

interface OpenAIImageData {
  b64_json?: string;
  revised_prompt?: string;
}

interface OpenAIImageResponse {
  data?: OpenAIImageData[];
  usage?: unknown;
  error?: {
    message?: string;
  };
}

export function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

export async function testOpenAIImageConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/models/${OPENAI_IMAGE_MODEL}`, {
      headers: {
        Authorization: `Bearer ${getOpenAIApiKey()}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('OpenAI image connection test failed:', error);
    return false;
  }
}

export async function generateOpenAIImage(options: {
  prompt: string;
  size: OpenAIImageSize;
}): Promise<OpenAIImageResult> {
  const response = await fetch(`${OPENAI_API_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: options.prompt,
      n: 1,
      size: options.size,
      output_format: 'png',
    }),
  });

  return parseOpenAIImageResponse(response, 'OpenAI image generation failed');
}

export async function editOpenAIImage(options: {
  prompt: string;
  imageBuffer: Buffer;
  imageName: string;
  mimeType: string;
  size: OpenAIImageSize;
}): Promise<OpenAIImageResult> {
  const formData = new FormData();
  formData.append('model', OPENAI_IMAGE_MODEL);
  formData.append('prompt', options.prompt);
  formData.append('n', '1');
  formData.append('size', options.size);
  formData.append('output_format', 'png');
  formData.append(
    'image',
    new Blob([new Uint8Array(options.imageBuffer)], { type: options.mimeType }),
    options.imageName
  );

  const response = await fetch(`${OPENAI_API_BASE_URL}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getOpenAIApiKey()}`,
    },
    body: formData,
  });

  return parseOpenAIImageResponse(response, 'OpenAI image edit failed');
}

async function parseOpenAIImageResponse(response: Response, fallbackMessage: string): Promise<OpenAIImageResult> {
  const result = await response.json().catch(() => ({})) as OpenAIImageResponse;

  if (!response.ok) {
    throw new Error(`${fallbackMessage}: ${result.error?.message || response.statusText}`);
  }

  const image = result.data?.[0];
  if (!image?.b64_json) {
    throw new Error(`${fallbackMessage}: no image returned`);
  }

  return {
    buffer: Buffer.from(image.b64_json, 'base64'),
    mediaType: 'image/png',
    revisedPrompt: image.revised_prompt,
    usage: result.usage,
  };
}
