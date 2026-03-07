"use client";

import * as React from "react";
import { useAIModelSettings } from "./ai-model-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Activity, Settings, X } from "lucide-react";
import type { AIProvider } from "@/lib/ai/config";

interface ProviderSelectProps {
  label: string;
  value: AIProvider;
  onChange: (provider: AIProvider) => void;
}

function ProviderSelect({ label, value, onChange }: ProviderSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as AIProvider)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gemini">Gemini (Google AI)</SelectItem>
          <SelectItem value="ollama">Ollama (Local)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface AIModelSettingsProps {
  onClose?: () => void;
}

export function AIModelSettings({ onClose }: AIModelSettingsProps) {
  const { settings, setSettings, testConnection } = useAIModelSettings();

  const [isChecking, setIsChecking] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  const usingOllama = settings.chat.provider === "ollama" || settings.analysis.provider === "ollama";

  const handleTestConnection = async () => {
    setIsChecking(true);
    setConnectionError(null);

    try {
      const connected = await testConnection();
      if (!connected) {
        setConnectionError("Unable to connect to Ollama. Please check your base URL and local server.");
      }
    } catch (error) {
      setConnectionError(`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-[32rem]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>AI Model Settings</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>Configure separate providers for chat and image analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProviderSelect
          label="Chat Provider"
          value={settings.chat.provider}
          onChange={(provider) => {
            setSettings({
              chat: {
                provider,
                model: provider === "ollama" ? settings.chat.model || "qwen3.5:9b-q8_0" : "gemini-3.1-flash-preview",
              },
            });
          }}
        />

        <div className="space-y-2">
          <Label>Chat Model</Label>
          <Input
            value={settings.chat.model}
            onChange={(e) => setSettings({ chat: { model: e.target.value } })}
            placeholder={settings.chat.provider === "ollama" ? "qwen3.5:9b-q8_0" : "gemini-3.1-flash-preview"}
          />
        </div>

        <ProviderSelect
          label="Image Analysis Provider"
          value={settings.analysis.provider}
          onChange={(provider) => {
            setSettings({
              analysis: {
                provider,
                model: provider === "ollama" ? settings.analysis.model || "qwen3.5:9b-q8_0" : "gemini-2.5-flash-image-preview",
              },
            });
          }}
        />

        <div className="space-y-2">
          <Label>Image Analysis Model</Label>
          <Input
            value={settings.analysis.model}
            onChange={(e) => setSettings({ analysis: { model: e.target.value } })}
            placeholder={settings.analysis.provider === "ollama" ? "llava:latest (vision-capable)" : "gemini-2.5-flash-image-preview"}
          />
        </div>

        {usingOllama && (
          <div className="space-y-4 rounded-md border p-4">
            <div className="space-y-2">
              <Label>Ollama Base URL</Label>
              <Input
                type="url"
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({ ollamaBaseUrl: e.target.value })}
                placeholder="http://localhost:11434"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Connected:{" "}
                <span className={connectionError ? "text-red-500" : "text-green-500"}>
                  {connectionError ? "No" : "Yes"}
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isChecking}>
                {isChecking ? "..." : "Test Connection"}
              </Button>
            </div>

            {connectionError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                {connectionError}
              </div>
            ) : (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                <Activity className="mr-2 inline h-4 w-4" />
                Ollama is reachable.
              </div>
            )}
          </div>
        )}

        {!usingOllama && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
            <Activity className="mr-2 inline h-4 w-4" />
            Both providers are set to Gemini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AIModelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIModelSettingsModal({ open, onOpenChange }: AIModelSettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative z-10">
        <AIModelSettings onClose={() => onOpenChange(false)} />
      </div>
    </div>
  );
}
