"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getResolutionPresetsForProvider, type ProviderType, DEFAULT_RESOLUTION } from "@/lib/config/resolution-presets";

interface BatchSettingsDialogProps {
    batchId: string;
    currentSettings: {
        provider: ProviderType;
        defaults?: {
            count?: number;
            resolution?: string;
        };
    };
    onSettingsUpdated: () => void;
}

export function BatchSettingsDialog({
    batchId,
    currentSettings,
    onSettingsUpdated,
}: BatchSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [provider, setProvider] = useState<ProviderType>(currentSettings.provider);
    const [count, setCount] = useState(currentSettings.defaults?.count || 1);
    const [resolution, setResolution] = useState(currentSettings.defaults?.resolution || DEFAULT_RESOLUTION);

    // Get available resolutions for the current provider
    const availableResolutions = getResolutionPresetsForProvider(provider);

    // Handle provider change - reset resolution if current one isn't supported
    const handleProviderChange = (newProvider: ProviderType) => {
        setProvider(newProvider);
        const newAvailableResolutions = getResolutionPresetsForProvider(newProvider);
        const currentResolutionSupported = newAvailableResolutions.some(r => r.id === resolution);
        if (!currentResolutionSupported) {
            setResolution(DEFAULT_RESOLUTION);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/batches/${batchId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    defaults: {
                        count,
                        resolution,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update settings');
            }

            toast.success('Settings updated!');
            setOpen(false);
            onSettingsUpdated();
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Batch Settings</DialogTitle>
                    <DialogDescription>
                        Update generation settings for this batch.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="provider">Generation Provider</Label>
                        <Select value={provider} onValueChange={(value: ProviderType) => handleProviderChange(value)}>
                            <SelectTrigger id="provider">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">🖼️ OpenAI GPT Image 2 (Default)</SelectItem>
                                <SelectItem value="openrouter">🌐 OpenRouter GPT-5.4 Image 2</SelectItem>
                                <SelectItem value="gemini">⚡ Google Gemini 2.5 (Fast, 1K only)</SelectItem>
                                <SelectItem value="gemini3">✨ Google Gemini 3 Pro (1K-4K)</SelectItem>
                                <SelectItem value="comfyui">🎨 ComfyUI - zImage (Advanced)</SelectItem>
                                <SelectItem value="comfyui-krea">🎨 ComfyUI - Krea (Advanced)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="resolution">Image Resolution</Label>
                        <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger id="resolution">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableResolutions.map((preset) => (
                                    <SelectItem key={preset.id} value={preset.id}>
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="count">Images per Prompt</Label>
                        <Input
                            id="count"
                            type="number"
                            min="1"
                            max="10"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
