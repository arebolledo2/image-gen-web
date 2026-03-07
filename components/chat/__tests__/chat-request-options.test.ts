import { describe, expect, it } from "vitest";
import { buildChatRequestOptions } from "../chat-request-options";

describe("buildChatRequestOptions", () => {
  it("embeds aiConfig in sendMessage request body", () => {
    const aiConfig = {
      ollamaBaseUrl: "http://localhost:11434",
      chat: { provider: "ollama" as const, model: "qwen3.5:9b-q8_0" },
      analysis: { provider: "gemini" as const, model: "gemini-2.5-flash-image-preview" },
    };

    expect(buildChatRequestOptions(aiConfig)).toEqual({
      body: {
        aiConfig,
      },
    });
  });
});
