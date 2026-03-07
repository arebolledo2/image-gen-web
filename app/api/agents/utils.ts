import { NextResponse } from "next/server";
import type { AIModelSelection } from "@/lib/ai/config";

const OLLAMA_MODEL_NOT_FOUND_CODE = "OLLAMA_MODEL_NOT_FOUND";

interface OllamaErrorPayload {
  error?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "Unknown error";
}

function getResponseBody(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const value = (error as { responseBody?: unknown }).responseBody;
  return typeof value === "string" ? value : undefined;
}

function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : undefined;
}

function getUrl(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const value = (error as { url?: unknown }).url;
  return typeof value === "string" ? value : undefined;
}

function parseOllamaPayload(responseBody: string | undefined): OllamaErrorPayload | undefined {
  if (!responseBody) {
    return undefined;
  }

  try {
    return JSON.parse(responseBody) as OllamaErrorPayload;
  } catch {
    return undefined;
  }
}

function isOllamaModelNotFoundError(error: unknown): boolean {
  const statusCode = getStatusCode(error);
  if (statusCode !== 404) {
    return false;
  }

  const url = getUrl(error);
  if (typeof url === "string" && !url.includes("/api/chat")) {
    return false;
  }

  const responseBody = getResponseBody(error);
  const parsedBody = parseOllamaPayload(responseBody);
  const text = `${getErrorMessage(error)} ${parsedBody?.error ?? ""}`.toLowerCase();
  return text.includes("model") && text.includes("not found");
}

export function buildAgentErrorResponse(
  error: unknown,
  chatSelection: AIModelSelection,
  fallbackMessage: string,
) {
  if (chatSelection.provider === "ollama" && isOllamaModelNotFoundError(error)) {
    return NextResponse.json(
      {
        error: "The selected Ollama chat model is not available on your Ollama server.",
        code: OLLAMA_MODEL_NOT_FOUND_CODE,
        provider: "ollama",
        model: chatSelection.model,
        remediation:
          "Install/select an available Ollama model, or switch Chat Provider to Gemini in AI Model Settings.",
      },
      { status: 400 },
    );
  }

  const message = getErrorMessage(error);
  return NextResponse.json(
    { error: message === "Unknown error" ? fallbackMessage : message },
    { status: 500 },
  );
}
