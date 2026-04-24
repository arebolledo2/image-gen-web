import { describe, expect, it } from "vitest";
import {
  defaultAIModelSettings,
  migrateAIModelSettings,
  toAIRequestConfig,
} from "../ai-model-settings-provider";

describe("migrateAIModelSettings", () => {
  it("returns defaults for invalid persisted payload", () => {
    const migrated = migrateAIModelSettings(null);
    expect(migrated).toEqual(defaultAIModelSettings);
  });

  it("migrates legacy v1 shape into v2", () => {
    const migrated = migrateAIModelSettings({
      provider: "ollama",
      ollamaBaseUrl: "http://localhost:11434",
      ollamaDefaultModel: "llama3.2",
    });

    expect(migrated.version).toBe(2);
    expect(migrated.chat.provider).toBe("ollama");
    expect(migrated.chat.model).toBe("llama3.2");
    expect(migrated.analysis.provider).toBe("gemini");
  });

  it("migrates legacy hardcoded Ollama default to server default", () => {
    const migrated = migrateAIModelSettings({
      version: 2,
      ollamaBaseUrl: "http://localhost:11434",
      chat: { provider: "ollama", model: "qwen3.5:9b-q8_0" },
      analysis: { provider: "ollama", model: "qwen3.5:9b-q8_0" },
    });

    expect(migrated.chat.model).toBe("");
    expect(migrated.analysis.model).toBe("");
  });

  it("keeps v2 data and normalizes invalid values", () => {
    const migrated = migrateAIModelSettings({
      version: 2,
      ollamaBaseUrl: "invalid-url",
      chat: { provider: "invalid", model: "   " },
      analysis: { provider: "ollama", model: "llava:latest" },
    });

    expect(migrated.ollamaBaseUrl).toBe(defaultAIModelSettings.ollamaBaseUrl);
    expect(migrated.chat.provider).toBe("gemini");
    expect(migrated.chat.model).toBe(defaultAIModelSettings.chat.model);
    expect(migrated.analysis.provider).toBe("ollama");
    expect(migrated.analysis.model).toBe("llava:latest");
  });
});

describe("toAIRequestConfig", () => {
  it("omits empty model settings so the server can apply env defaults", () => {
    const payload = toAIRequestConfig({
      version: 2,
      ollamaBaseUrl: "http://localhost:11434",
      chat: { provider: "ollama", model: "" },
      analysis: { provider: "gemini", model: "gemini-2.5-flash-image-preview" },
    });

    expect(payload).toEqual({
      ollamaBaseUrl: "http://localhost:11434",
      chat: { provider: "ollama" },
      analysis: { provider: "gemini", model: "gemini-2.5-flash-image-preview" },
    });
  });
});
