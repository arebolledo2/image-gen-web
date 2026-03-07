import type { AIRequestConfig } from "@/lib/ai/config";

export function buildChatRequestOptions(aiConfig: AIRequestConfig) {
  return {
    body: {
      aiConfig,
    },
  };
}
