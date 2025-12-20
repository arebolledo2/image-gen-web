import { getComfyUIConfig } from './config';

export class ComfyUIClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    const config = getComfyUIConfig();
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.timeout = config.timeout * 1000;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async submitPrompt(workflow: object, clientId?: string): Promise<{ prompt_id: string }> {
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId || crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit prompt: ${response.statusText}`);
    }

    return response.json();
  }

  async getHistory(promptId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/history/${promptId}`);
    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.statusText}`);
    }
    return response.json();
  }

  async waitForExecution(promptId: string, timeoutSeconds?: number): Promise<any> {
    const timeout = (timeoutSeconds || this.timeout / 1000) * 1000;
    const startTime = Date.now();
    const checkInterval = getComfyUIConfig().checkInterval;

    while (Date.now() - startTime < timeout) {
      try {
        const history = await this.getHistory(promptId);

        if (history[promptId]) {
          const status = history[promptId].status?.status_str;

          if (status === 'success') {
            return history[promptId];
          } else if (status === 'error') {
            const messages = history[promptId].status?.messages || [];
            throw new Error(`ComfyUI execution failed: ${JSON.stringify(messages)}`);
          }
        }
      } catch (error) {
        // History not available yet, continue waiting
        if (error instanceof Error && error.message.includes('execution failed')) {
          throw error;
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Timeout waiting for execution');
  }

  async downloadOutputImages(promptId: string): Promise<Array<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }>> {
    const history = await this.getHistory(promptId);
    const outputs = history[promptId]?.outputs || {};

    const downloadedImages = [];

    for (const [nodeId, nodeOutput] of Object.entries(outputs)) {
      if ((nodeOutput as any).images) {
        for (const image of (nodeOutput as any).images) {
          const filename = image.filename;
          const subfolder = image.subfolder || '';
          const type = image.type || 'output';

          let url = `${this.baseUrl}/view?filename=${encodeURIComponent(filename)}&type=${type}`;
          if (subfolder) {
            url += `&subfolder=${encodeURIComponent(subfolder)}`;
          }

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/png';

          downloadedImages.push({ buffer, filename, contentType });
        }
      }
    }

    return downloadedImages;
  }
}
