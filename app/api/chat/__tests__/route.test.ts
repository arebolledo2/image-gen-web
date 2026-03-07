import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAgentUIStreamResponseMock: vi.fn(),
  createImageAgentMock: vi.fn(),
  getChatModelForConfigMock: vi.fn(),
  getAnalysisModelForConfigMock: vi.fn(),
}));

vi.mock("ai", () => ({
  createAgentUIStreamResponse: mocks.createAgentUIStreamResponseMock,
}));

vi.mock("@/lib/agent", () => ({
  createImageAgent: mocks.createImageAgentMock,
}));

vi.mock("@/lib/ai/model", () => ({
  resolveAIRequestConfig: vi.fn((input) => ({
    ollamaBaseUrl: "http://localhost:11434",
    chat: {
      provider: input?.chat?.provider ?? "gemini",
      model: input?.chat?.model ?? "gemini-3.1-flash-preview",
    },
    analysis: {
      provider: input?.analysis?.provider ?? "gemini",
      model: input?.analysis?.model ?? "gemini-2.5-flash-image-preview",
    },
  })),
  getChatModelForConfig: mocks.getChatModelForConfigMock,
  getAnalysisModelForConfig: mocks.getAnalysisModelForConfigMock,
}));

import { POST } from "../route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAgentUIStreamResponseMock.mockResolvedValue(new Response("ok", { status: 200 }));
    mocks.createImageAgentMock.mockReturnValue({ id: "agent" });
    mocks.getChatModelForConfigMock.mockReturnValue({ id: "chat-model" });
    mocks.getAnalysisModelForConfigMock.mockReturnValue({ id: "analysis-model" });
  });

  it("creates a request-scoped agent and streams chat response", async () => {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
        aiConfig: {
          chat: { provider: "ollama", model: "qwen3.5:9b-q8_0" },
        },
      }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.getChatModelForConfigMock).toHaveBeenCalled();
    expect(mocks.getAnalysisModelForConfigMock).toHaveBeenCalled();
    expect(mocks.createImageAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisProvider: "gemini",
        analysisModelId: "gemini-2.5-flash-image-preview",
      }),
    );
    expect(mocks.createAgentUIStreamResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uiMessages: [{ role: "user", content: "hello" }],
      }),
    );
  });

  it("returns 400 when payload validation fails", async () => {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        aiConfig: {},
      }),
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(400);
    expect(mocks.createAgentUIStreamResponseMock).not.toHaveBeenCalled();
  });
});
