"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { AIProvider, AIRequestConfigInput } from "@/lib/ai/config";

export interface AIModelSelectionSettings {
  provider: AIProvider;
  model: string;
}

export interface AIModelSettings {
  version: 2;
  ollamaBaseUrl: string;
  chat: AIModelSelectionSettings;
  analysis: AIModelSelectionSettings;
}

interface LegacyAIModelSettings {
  provider?: AIProvider;
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;
}

interface AIModelSettingsContextType {
  settings: AIModelSettings;
  setSettings: (settings: AIModelSettingsUpdate) => void;
  testConnection: () => Promise<boolean>;
  toRequestConfig: () => AIRequestConfigInput;
}

export interface AIModelSettingsUpdate {
  ollamaBaseUrl?: string;
  chat?: Partial<AIModelSelectionSettings>;
  analysis?: Partial<AIModelSelectionSettings>;
}

const STORAGE_KEY = "ai-model-settings";
const LEGACY_OLLAMA_DEFAULT_MODEL = "qwen3.5:9b-q8_0";
const DEFAULT_GEMINI_CHAT_MODEL = "gemini-3.1-flash-preview";
const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-2.5-flash-image-preview";
const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export const defaultAIModelSettings: AIModelSettings = {
  version: 2,
  ollamaBaseUrl: "http://localhost:11434",
  chat: {
    provider: "gemini",
    model: DEFAULT_GEMINI_CHAT_MODEL,
  },
  analysis: {
    provider: "gemini",
    model: DEFAULT_GEMINI_ANALYSIS_MODEL,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeModel(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeOllamaModel(value: unknown): string {
  const model = normalizeModel(value, "");
  return model === LEGACY_OLLAMA_DEFAULT_MODEL ? "" : model;
}

function normalizeProvider(value: unknown, fallback: AIProvider): AIProvider {
  return value === "ollama" || value === "gemini" || value === "openai" ? value : fallback;
}

function defaultModelForProvider(provider: AIProvider, kind: "chat" | "analysis"): string {
  if (provider === "ollama") {
    return "";
  }

  if (provider === "openai") {
    return DEFAULT_OPENAI_MODEL;
  }

  return kind === "chat" ? DEFAULT_GEMINI_CHAT_MODEL : DEFAULT_GEMINI_ANALYSIS_MODEL;
}

function normalizeProviderModel(provider: AIProvider, value: unknown, kind: "chat" | "analysis"): string {
  if (provider === "ollama") {
    return normalizeOllamaModel(value);
  }

  return normalizeModel(value, defaultModelForProvider(provider, kind));
}

function normalizeUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallback;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

export function migrateAIModelSettings(raw: unknown): AIModelSettings {
  if (!isRecord(raw)) {
    return defaultAIModelSettings;
  }

  if (raw.version === 2) {
    const chatRaw = isRecord(raw.chat) ? raw.chat : {};
    const analysisRaw = isRecord(raw.analysis) ? raw.analysis : {};

    const chatProvider = normalizeProvider(chatRaw.provider, defaultAIModelSettings.chat.provider);
    const analysisProvider = normalizeProvider(analysisRaw.provider, defaultAIModelSettings.analysis.provider);

    return {
      version: 2,
      ollamaBaseUrl: normalizeUrl(raw.ollamaBaseUrl, defaultAIModelSettings.ollamaBaseUrl),
      chat: {
        provider: chatProvider,
        model: normalizeProviderModel(chatProvider, chatRaw.model, "chat"),
      },
      analysis: {
        provider: analysisProvider,
        model: normalizeProviderModel(analysisProvider, analysisRaw.model, "analysis"),
      },
    };
  }

  // Legacy v1 migration
  const legacy = raw as LegacyAIModelSettings;
  const legacyProvider = normalizeProvider(legacy.provider, defaultAIModelSettings.chat.provider);
  const legacyModel = normalizeOllamaModel(legacy.ollamaDefaultModel);

  return {
    version: 2,
    ollamaBaseUrl: normalizeUrl(legacy.ollamaBaseUrl, defaultAIModelSettings.ollamaBaseUrl),
    chat: {
      provider: legacyProvider,
      model: legacyProvider === "ollama" ? legacyModel : defaultModelForProvider(legacyProvider, "chat"),
    },
    // Preserve previous intended behavior where image analysis stayed on Gemini.
    analysis: {
      provider: "gemini",
      model: defaultAIModelSettings.analysis.model,
    },
  };
}

export function toAIRequestConfig(settings: AIModelSettings): AIRequestConfigInput {
  const chatModel = settings.chat.model.trim();
  const analysisModel = settings.analysis.model.trim();

  return {
    ollamaBaseUrl: settings.ollamaBaseUrl,
    chat: {
      provider: settings.chat.provider,
      ...(chatModel ? { model: chatModel } : {}),
    },
    analysis: {
      provider: settings.analysis.provider,
      ...(analysisModel ? { model: analysisModel } : {}),
    },
  };
}

const AIModelSettingsContext = createContext<AIModelSettingsContextType | undefined>(undefined);

export function AIModelSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AIModelSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return migrateAIModelSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load AI model settings:", e);
    }
    return defaultAIModelSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setSettings = (newSettings: AIModelSettingsUpdate) => {
    setSettingsState((prev) => ({
      ...prev,
      ...newSettings,
      chat: {
        ...prev.chat,
        ...(newSettings.chat ?? {}),
      },
      analysis: {
        ...prev.analysis,
        ...(newSettings.analysis ?? {}),
      },
      version: 2,
    }));
  };

  const testConnection = async (): Promise<boolean> => {
    const isUsingOllama = settings.chat.provider === "ollama" || settings.analysis.provider === "ollama";
    if (!isUsingOllama) {
      return true;
    }

    try {
      const response = await fetch(`${settings.ollamaBaseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error("AI model connection test failed:", error);
      return false;
    }
  };

  const toRequestConfigForCurrentState = () => toAIRequestConfig(settings);

  return (
    <AIModelSettingsContext.Provider value={{ settings, setSettings, testConnection, toRequestConfig: toRequestConfigForCurrentState }}>
      {children}
    </AIModelSettingsContext.Provider>
  );
}

export function useAIModelSettings() {
  const context = useContext(AIModelSettingsContext);
  if (context === undefined) {
    throw new Error("useAIModelSettings must be used within an AIModelSettingsProvider");
  }
  return context;
}
