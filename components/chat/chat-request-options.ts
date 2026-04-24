import type { AIRequestConfigInput } from "@/lib/ai/config";

export function buildChatRequestOptions(aiConfig: AIRequestConfigInput) {
  return {
    body: {
      aiConfig,
    },
  };
}
