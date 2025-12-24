"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type PromptStyle = "terse" | "verbose";

interface SettingsContextType {
  promptStyle: PromptStyle;
  setPromptStyle: (style: PromptStyle) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [promptStyle, setPromptStyleState] = useState<PromptStyle>("terse");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("prompt-style") as PromptStyle;
    if (saved && (saved === "terse" || saved === "verbose")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPromptStyleState(saved);
    }
  }, []);

  const setPromptStyle = (style: PromptStyle) => {
    setPromptStyleState(style);
    localStorage.setItem("prompt-style", style);
  };

  return (
    <SettingsContext.Provider value={{ promptStyle, setPromptStyle }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
