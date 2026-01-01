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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AudioProvider = 'audiocraft' | 'elevenlabs';

interface AudioBatchSettingsDialogProps {
    batchId: string;
    currentSettings: {
        provider: string; // Accepts string from API, we'll cast it
        defaults?: {
            duration?: number;
            count?: number;
            temperature?: number;
        };
    };
    onSettingsUpdated: () => void;
}

export function AudioBatchSettingsDialog({
    batchId,
    currentSettings,
    onSettingsUpdated,
}: AudioBatchSettingsDialogProps) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Cast provider to AudioProvider type (from API it comes as string)
    const initialProvider = (currentSettings.provider === 'elevenlabs' || currentSettings.provider === 'audiocraft')
        ? currentSettings.provider
        : 'elevenlabs';
    const [provider, setProvider] = useState<AudioProvider>(initialProvider);
    const [useAutoDuration, setUseAutoDuration] = useState((currentSettings.defaults?.duration || 0) === 0);
    const [duration, setDuration] = useState(currentSettings.defaults?.duration || 1);
    const [count, setCount] = useState(currentSettings.defaults?.count || 1);
    const [temperature, setTemperature] = useState(currentSettings.defaults?.temperature || 1.0);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/audio-batches/${batchId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    defaults: {
                        duration: useAutoDuration ? 0 : duration,
                        count,
                        temperature,
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
                    <DialogTitle>Edit Audio Batch Settings</DialogTitle>
                    <DialogDescription>
                        Update generation settings for this audio batch.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="provider">Audio Provider</Label>
                        <Select value={provider} onValueChange={(value: AudioProvider) => setProvider(value)}>
                            <SelectTrigger id="provider">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="elevenlabs">✨ ElevenLabs (Recommended)</SelectItem>
                                <SelectItem value="audiocraft">🎵 AudioCraft</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Duration: {useAutoDuration ? 'Auto' : `${duration}s`}</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="auto-duration"
                                    checked={useAutoDuration}
                                    onCheckedChange={setUseAutoDuration}
                                />
                                <Label htmlFor="auto-duration" className="text-sm cursor-pointer">Auto</Label>
                            </div>
                        </div>
                        <Slider
                            value={[duration]}
                            onValueChange={(value) => setDuration(value[0])}
                            min={0.5}
                            max={10}
                            step={0.5}
                            disabled={useAutoDuration}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Variations per Prompt: {count}</Label>
                        <Slider
                            value={[count]}
                            onValueChange={(value) => setCount(value[0])}
                            min={1}
                            max={25}
                            step={1}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Temperature: {temperature.toFixed(1)}</Label>
                        <Slider
                            value={[temperature]}
                            onValueChange={(value) => setTemperature(value[0])}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                        />
                        <p className="text-xs text-muted-foreground">
                            Higher = more creative, Lower = more predictable
                        </p>
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
