import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubjectAgentMock: vi.fn(),
  getChatModelForConfigMock: vi.fn((config) => ({ id: `${config.chat.provider}:${config.chat.model}` })),
  resolveAIRequestConfigMock: vi.fn((input) => ({
    ollamaBaseUrl: input?.ollamaBaseUrl ?? "http://localhost:11434",
    chat: {
      provider: input?.chat?.provider ?? "gemini",
      model: input?.chat?.model ?? "gemini-3.1-flash-preview",
    },
    analysis: {
      provider: input?.analysis?.provider ?? "gemini",
      model: input?.analysis?.model ?? "gemini-2.5-flash-image-preview",
    },
  })),
}));

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      json: (data: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(data), {
          status: init?.status ?? 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  };
});

vi.mock("@/lib/ai/agents", () => ({
  createSubjectAgent: mocks.createSubjectAgentMock,
}));

vi.mock("@/lib/ai/model", () => ({
  getChatModelForConfig: mocks.getChatModelForConfigMock,
  resolveAIRequestConfig: mocks.resolveAIRequestConfigMock,
}));

import { POST } from "../route";

describe("POST /api/agents/create-subject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSubjectAgentMock.mockResolvedValue({
      name: "Mechanical Spider: Arachno-Droid Sentinel",
      description: "A multi-legged combat automaton with obsidian plating.",
    });
  });

  it("uses default request config when aiConfig is omitted", async () => {
    const response = await POST(new Request("http://localhost/api/agents/create-subject", {
      method: "POST",
      body: JSON.stringify({ concept: "mechanical spider" }),
      headers: { "Content-Type": "application/json" },
    }) as any);

    expect(response.status).toBe(200);
    expect(mocks.getChatModelForConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chat: expect.objectContaining({
          provider: "gemini",
          model: "gemini-3.1-flash-preview",
        }),
      }),
    );
    expect(mocks.createSubjectAgentMock).toHaveBeenCalledWith(
      "mechanical spider",
      expect.objectContaining({ id: "gemini:gemini-3.1-flash-preview" }),
    );
  });

  it("uses request-scoped aiConfig.chat for model resolution", async () => {
    const response = await POST(new Request("http://localhost/api/agents/create-subject", {
      method: "POST",
      body: JSON.stringify({
        concept: "fire elemental",
        aiConfig: {
          chat: {
            provider: "ollama",
            model: "llama3.2",
          },
        },
      }),
      headers: { "Content-Type": "application/json" },
    }) as any);

    expect(response.status).toBe(200);
    expect(mocks.getChatModelForConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chat: expect.objectContaining({
          provider: "ollama",
          model: "llama3.2",
        }),
      }),
    );
    expect(mocks.createSubjectAgentMock).toHaveBeenCalledWith(
      "fire elemental",
      expect.objectContaining({ id: "ollama:llama3.2" }),
    );
  });

  it("returns structured remediation error when Ollama model is missing", async () => {
    mocks.createSubjectAgentMock.mockRejectedValue({
      message: "Not Found",
      statusCode: 404,
      url: "http://localhost:11434/api/chat",
      responseBody: "{\"error\":\"model 'gemini-3.1-flash-preview' not found\"}",
    });

    const response = await POST(new Request("http://localhost/api/agents/create-subject", {
      method: "POST",
      body: JSON.stringify({
        concept: "fire elemental",
        aiConfig: {
          chat: {
            provider: "ollama",
            model: "gemini-3.1-flash-preview",
          },
        },
      }),
      headers: { "Content-Type": "application/json" },
    }) as any);

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("OLLAMA_MODEL_NOT_FOUND");
    expect(payload.provider).toBe("ollama");
    expect(payload.model).toBe("gemini-3.1-flash-preview");
    expect(payload.remediation).toContain("switch Chat Provider to Gemini");
  });
});
