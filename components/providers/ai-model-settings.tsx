"use client";

import * as React from "react";
import { useAIModelSettings } from "./ai-model-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Activity, Settings, X } from "lucide-react";
import type { AIProvider } from "@/lib/providers/types";

export function AIModelSettings() {
  const { settings, setSettings, testConnection } = useAIModelSettings();

  const [isChecking, setIsChecking] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  const handleProviderChange = (provider: AIProvider) => {
    setSettings({ provider });
    setConnectionError(null);
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSettings({ ollamaBaseUrl: url });
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      setConnectionError("Invalid URL format");
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ollamaDefaultModel: e.target.value });
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    setConnectionError(null);

    try {
      if (settings.provider !== 'ollama') {
        // For Gemini, just confirm it's configured
        setConnectionError(null);
      } else {
        const connected = await testConnection();
        if (connected) {
          setConnectionError(null);
        } else {
          setConnectionError("Unable to connect to Ollama. Please check your settings.");
        }
      }
    } catch (error) {
      setConnectionError(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>AI Model Settings</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => (window.location.href = window.location.pathname)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Configure your AI model provider</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={settings.provider || "gemini"} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini">Gemini (Google AI)</SelectItem>
              <SelectItem value="ollama">Ollama (Local)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ollama Settings */}
        {settings.provider === 'ollama' && (
          <div className="space-y-4 mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Connected:{" "}
                <span className={connectionError ? "text-red-500" : "text-green-500"}>
                  {settings.provider !== 'ollama' ? "N/A (Using Gemini)" : connectionError ? "No" : "Yes"}
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isChecking}>
                {isChecking ? "..." : "Test Connection"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Ollama Base URL</Label>
              <Input
                type="url"
                defaultValue={settings.ollamaBaseUrl}
                onChange={handleBaseUrlChange}
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Model</Label>
              <Input
                type="text"
                defaultValue={settings.ollamaDefaultModel}
                onChange={handleModelChange}
                placeholder="qwen3.5:9b-q8_0"
              />
            </div>

            {connectionError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                {connectionError}
              </div>
            )}

            {!connectionError && settings.provider === 'ollama' && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                <Activity className="h-4 w-4 inline mr-2" />
                Ollama is connected and ready.
              </div>
            )}
          </div>
        )}

        {/* Gemini Note */}
        {settings.provider === 'gemini' && (
          <div className="mt-6 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800">
            <Activity className="h-4 w-4 inline mr-2" />
            Using Google Gemini API. Configure your API key in your environment or Next.js config.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Modal wrapper component
export function AIModelSettingsModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <AIModelSettings />
    </div>
  );
}