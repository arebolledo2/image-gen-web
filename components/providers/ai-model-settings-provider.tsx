"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type AIProvider = 'ollama' | 'gemini';

export interface AIModelSettings {
  provider: AIProvider;
  ollamaBaseUrl: string;
  ollamaDefaultModel: string;
}

interface AIModelSettingsContextType {
  settings: AIModelSettings;
  setSettings: (settings: Partial<AIModelSettings>) => void;
  testConnection: () => Promise<boolean>;
}

const defaultSettings: AIModelSettings = {
  provider: 'gemini',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaDefaultModel: 'qwen3.5:9b-q8_0',
};

const AIModelSettingsContext = createContext<AIModelSettingsContextType | undefined>(undefined);

export function AIModelSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AIModelSettings>(() => {
    try {
      const saved = localStorage.getItem("ai-model-settings");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load AI model settings:", e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("ai-model-settings", JSON.stringify(settings));
  }, [settings]);

  const setSettings = (newSettings: Partial<AIModelSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  };

  const testConnection = async (): Promise<boolean> => {
    if (settings.provider !== 'ollama') {
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

  return (
    <AIModelSettingsContext.Provider value={{ settings, setSettings, testConnection }}>
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