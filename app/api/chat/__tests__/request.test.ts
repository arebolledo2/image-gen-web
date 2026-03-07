import { beforeEach, describe, expect, it } from "vitest";
import { parseChatRequest } from "../request";

describe("parseChatRequest", () => {
  beforeEach(() => {
    process.env.AI_MODEL_PROVIDER = "gemini";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";
  });

  it("returns validation error when messages is missing", () => {
    const parsed = parseChatRequest({ aiConfig: {} });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error).toContain("expected array");
    }
  });

  it("merges partial aiConfig with defaults", () => {
    const parsed = parseChatRequest({
      messages: [],
      aiConfig: {
        chat: { provider: "ollama", model: "qwen3.5:9b-q8_0" },
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiConfig.chat.provider).toBe("ollama");
      expect(parsed.data.aiConfig.chat.model).toBe("qwen3.5:9b-q8_0");
      expect(parsed.data.aiConfig.analysis.provider).toBe("gemini");
      expect(parsed.data.aiConfig.analysis.model).toBe("gemini-2.5-flash-image-preview");
    }
  });

  it("sanitizes invalid base URL to env fallback", () => {
    const parsed = parseChatRequest({
      messages: [],
      aiConfig: {
        ollamaBaseUrl: "invalid-url",
      },
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiConfig.ollamaBaseUrl).toBe("http://localhost:11434");
    }
  });
});
