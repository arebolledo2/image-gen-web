import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImageAgent } from "../agent";
import * as queries from "@/lib/db/queries";
import { readImage } from "@/lib/storage/local-storage";
import { generateText } from "ai";

vi.mock("@/lib/db/queries", () => ({
  getImageDetails: vi.fn(),
}));

vi.mock("@/lib/storage/local-storage", () => ({
  readImage: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

describe("createImageAgent analyzeImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the injected analysis model for analyzeImage", async () => {
    vi.mocked(queries.getImageDetails).mockResolvedValue({
      id: "img-1",
      filePath: "outputs/test.png",
    } as never);
    vi.mocked(readImage).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(generateText).mockResolvedValue({
      text: "Detected a turret sprite facing forward.",
    } as never);

    const chatModel = { model: "chat-model" } as any;
    const analysisModel = { model: "analysis-model" } as any;
    const agent = createImageAgent({
      chatModel,
      analysisModel,
      analysisProvider: "gemini",
      analysisModelId: "gemini-2.5-flash-image-preview",
    });

    const analyzeImageTool = (agent.tools as any).analyzeImage;
    const result = await analyzeImageTool.execute({
      imageId: "img-1",
      prompt: "Describe this sprite.",
    });

    expect(result).toEqual({
      imageId: "img-1",
      analysis: "Detected a turret sprite facing forward.",
    });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: analysisModel,
      }),
    );
  });

  it("returns fail-fast structured error when Ollama rejects image input", async () => {
    vi.mocked(queries.getImageDetails).mockResolvedValue({
      id: "img-2",
      filePath: "outputs/test.png",
    } as never);
    vi.mocked(readImage).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(generateText).mockRejectedValue(new Error("This model does not support image inputs"));

    const agent = createImageAgent({
      chatModel: { model: "chat-model" } as any,
      analysisModel: { model: "analysis-model" } as any,
      analysisProvider: "ollama",
      analysisModelId: "qwen3.5:9b-q8_0",
    });

    const analyzeImageTool = (agent.tools as any).analyzeImage;

    await expect(
      analyzeImageTool.execute({
        imageId: "img-2",
        prompt: "Analyze the image.",
      }),
    ).rejects.toThrow("UNSUPPORTED_IMAGE_ANALYSIS_MODEL");
  });
});
