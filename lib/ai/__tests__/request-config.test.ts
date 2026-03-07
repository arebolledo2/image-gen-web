import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBodyWithAIConfig } from "../request-config";

describe("parseBodyWithAIConfig", () => {
  it("merges defaults when aiConfig is omitted", () => {
    process.env.AI_MODEL_PROVIDER = "gemini";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";

    const parsed = parseBodyWithAIConfig({ concept: "robot turret" }, {
      concept: z.string(),
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.concept).toBe("robot turret");
      expect(parsed.data.aiConfig.chat.provider).toBe("gemini");
      expect(parsed.data.aiConfig.analysis.provider).toBe("gemini");
    }
  });

  it("accepts partial aiConfig and resolves missing fields", () => {
    process.env.AI_MODEL_PROVIDER = "gemini";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";

    const parsed = parseBodyWithAIConfig({
      concept: "robot turret",
      aiConfig: {
        chat: {
          provider: "ollama",
        },
      },
    }, {
      concept: z.string(),
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiConfig.chat.provider).toBe("ollama");
      expect(parsed.data.aiConfig.chat.model).toBe("qwen3.5:9b-q8_0");
      expect(parsed.data.aiConfig.analysis.provider).toBe("gemini");
    }
  });

  it("returns validation errors for invalid aiConfig", () => {
    const parsed = parseBodyWithAIConfig({
      concept: "robot turret",
      aiConfig: {
        chat: {
          provider: "invalid-provider",
        },
      },
    }, {
      concept: z.string(),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.toLowerCase()).toContain("invalid");
    }
  });
});
