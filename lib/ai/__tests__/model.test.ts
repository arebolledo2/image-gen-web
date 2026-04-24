import { beforeEach, describe, expect, it, vi } from "vitest";

const googleMock = vi.fn((model: string) => ({ provider: "gemini", model }));
const ollamaModelMock = vi.fn((model: string) => ({ provider: "ollama", model }));
const createOllamaMock = vi.fn(() => ollamaModelMock);
const wrapLanguageModelMock = vi.fn(({ model }) => model);

vi.mock("@ai-sdk/google", () => ({
  google: googleMock,
}));

vi.mock("ollama-ai-provider-v2", () => ({
  createOllama: createOllamaMock,
}));

vi.mock("ai", () => ({
  wrapLanguageModel: wrapLanguageModelMock,
}));

vi.mock("@ai-sdk/devtools", () => ({
  devToolsMiddleware: vi.fn(() => ({})),
}));

async function loadModelModule() {
  vi.resetModules();
  return import("../model");
}

describe("resolveAIRequestConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_MODEL_PROVIDER = "gemini";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";
  });

  it("defaults to environment-backed chat + gemini analysis when config is omitted", async () => {
    const modelModule = await loadModelModule();

    const config = modelModule.resolveAIRequestConfig();

    expect(config.chat.provider).toBe("gemini");
    expect(config.analysis.provider).toBe("gemini");
    expect(config.chat.model).toBe("gemini-3.1-flash-preview");
    expect(config.analysis.model).toBe("gemini-2.5-flash-image-preview");
  });

  it("merges partial config and sanitizes invalid base URL", async () => {
    const modelModule = await loadModelModule();

    const config = modelModule.resolveAIRequestConfig({
      ollamaBaseUrl: "notaurl",
      chat: {
        provider: "ollama",
        model: "llama3.2-vision",
      },
    });

    expect(config.ollamaBaseUrl).toBe("http://localhost:11434");
    expect(config.chat.provider).toBe("ollama");
    expect(config.chat.model).toBe("llama3.2-vision");
    expect(config.analysis.provider).toBe("gemini");
  });

  it("uses OLLAMA_DEFAULT_MODEL when Ollama is selected without an explicit model", async () => {
    process.env.AI_MODEL_PROVIDER = "ollama";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.6:27b";
    const modelModule = await loadModelModule();

    const config = modelModule.resolveAIRequestConfig({
      chat: { provider: "ollama" },
      analysis: { provider: "ollama" },
    });

    expect(config.chat.model).toBe("qwen3.6:27b");
    expect(config.analysis.model).toBe("qwen3.6:27b");
  });
});

describe("request-scoped model selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_MODEL_PROVIDER = "gemini";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";
  });

  it("uses Gemini for chat model when chat provider is gemini", async () => {
    const modelModule = await loadModelModule();
    const config = modelModule.resolveAIRequestConfig({
      chat: { provider: "gemini", model: "gemini-3.1-flash-preview" },
      analysis: { provider: "gemini", model: "gemini-2.5-flash-image-preview" },
    });

    modelModule.getChatModelForConfig(config);

    expect(googleMock).toHaveBeenCalledWith("gemini-3.1-flash-preview");
  });

  it("uses Ollama for chat model and wires base URL through createOllama", async () => {
    const modelModule = await loadModelModule();
    const config = modelModule.resolveAIRequestConfig({
      ollamaBaseUrl: "http://localhost:11434",
      chat: { provider: "ollama", model: "llama3.2" },
      analysis: { provider: "gemini", model: "gemini-2.5-flash-image-preview" },
    });

    modelModule.getChatModelForConfig(config);

    expect(createOllamaMock).toHaveBeenCalledWith({ baseURL: "http://localhost:11434/api" });
    expect(ollamaModelMock).toHaveBeenCalledWith("llama3.2");
  });

  it("uses Gemini for analysis model when analysis provider is gemini", async () => {
    const modelModule = await loadModelModule();
    const config = modelModule.resolveAIRequestConfig({
      analysis: { provider: "gemini", model: "gemini-2.5-flash-image-preview" },
    });

    modelModule.getAnalysisModelForConfig(config);

    expect(googleMock).toHaveBeenCalledWith("gemini-2.5-flash-image-preview");
  });

  it("uses Ollama for analysis model when analysis provider is ollama", async () => {
    const modelModule = await loadModelModule();
    const config = modelModule.resolveAIRequestConfig({
      ollamaBaseUrl: "http://localhost:11434/",
      analysis: { provider: "ollama", model: "llava:latest" },
    });

    modelModule.getAnalysisModelForConfig(config);

    expect(createOllamaMock).toHaveBeenCalledWith({ baseURL: "http://localhost:11434/api" });
    expect(ollamaModelMock).toHaveBeenCalledWith("llava:latest");
  });
});
