"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StyleEditFormProps {
  editName: string;
  setEditName: (name: string) => void;
  editDescription: string;
  setEditDescription: (description: string) => void;
  editPrimaryColors: string[];
  setEditPrimaryColors: (colors: string[]) => void;
  editAccentColors: string[];
  setEditAccentColors: (colors: string[]) => void;
  editBackground: string;
  setEditBackground: (color: string) => void;
  editMaterials: string[];
  setEditMaterials: (materials: string[]) => void;
  editEffects: string[];
  setEditEffects: (effects: string[]) => void;
  editFinish: string;
  setEditFinish: (finish: string) => void;
}

export function StyleEditForm({
  editName,
  setEditName,
  editDescription,
  setEditDescription,
  editPrimaryColors,
  setEditPrimaryColors,
  editAccentColors,
  setEditAccentColors,
  editBackground,
  setEditBackground,
  editMaterials,
  setEditMaterials,
  editEffects,
  setEditEffects,
  editFinish,
  setEditFinish,
}: StyleEditFormProps) {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiAssist = async () => {
    if (!aiRequest.trim()) return;

    setAiLoading(true);
    try {
      const response = await fetch("/api/agents/edit-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStyle: {
            name: editName,
            description: editDescription,
            palette: {
              primary: editPrimaryColors,
              accent: editAccentColors,
              background: editBackground,
            },
            renderingCues: {
              materials: editMaterials,
              effects: editEffects,
              finish: editFinish,
            },
          },
          userRequest: aiRequest,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI suggestions");
      }

      const data = await response.json();
      const newStyle = data.style;

      setEditName(newStyle.name);
      setEditDescription(newStyle.description || "");
      setEditPrimaryColors(newStyle.palette.primary);
      setEditAccentColors(newStyle.palette.accent);
      setEditBackground(newStyle.palette.background);
      setEditMaterials(newStyle.renderingCues.materials);
      setEditEffects(newStyle.renderingCues.effects);
      setEditFinish(newStyle.renderingCues.finish);

      setAiDialogOpen(false);
      setAiRequest("");
    } catch (error) {
      console.error("Error with AI assist:", error);
      toast.error("Failed to get AI suggestions");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Style</CardTitle>
            <CardDescription>Modify all style details including colors and rendering cues</CardDescription>
          </div>
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="mr-2 h-4 w-4" />
                AI Assist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Style Assist</DialogTitle>
                <DialogDescription>
                  Describe how you want to modify the style and AI will update it for you.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  value={aiRequest}
                  onChange={(e) => setAiRequest(e.target.value)}
                  placeholder="e.g., make the colors warmer, add a sunset theme, make it more vibrant..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
                  Cancel
                </Button>
                <Button onClick={handleAiAssist} disabled={aiLoading || !aiRequest.trim()}>
                  {aiLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply AI Changes
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Style name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Style description"
            rows={4}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Color Palette</h3>

          <div className="space-y-4">
            <ColorListEditor
              label="Primary Colors"
              colors={editPrimaryColors}
              setColors={setEditPrimaryColors}
            />
            <ColorListEditor
              label="Accent Colors"
              colors={editAccentColors}
              setColors={setEditAccentColors}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Background Color</label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={editBackground}
                  onChange={(e) => setEditBackground(e.target.value)}
                  className="w-12 h-8"
                />
                <Input
                  type="text"
                  value={editBackground}
                  onChange={(e) => setEditBackground(e.target.value)}
                  className="w-32 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Rendering Cues</h3>

          <div className="space-y-4">
            <StringListEditor
              label="Materials"
              addLabel="Add Material"
              placeholder="e.g., glass, metal, wood"
              items={editMaterials}
              setItems={setEditMaterials}
            />
            <StringListEditor
              label="Effects"
              addLabel="Add Effect"
              placeholder="e.g., glow, shadow, blur"
              items={editEffects}
              setItems={setEditEffects}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Finish</label>
              <Input
                value={editFinish}
                onChange={(e) => setEditFinish(e.target.value)}
                placeholder="e.g., matte, glossy, satin"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorListEditor({
  label,
  colors,
  setColors,
}: {
  label: string;
  colors: string[];
  setColors: (colors: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setColors([...colors, "#000000"])}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Color
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <div key={i} className="flex items-center gap-2 p-2 border rounded">
            <Input
              type="color"
              value={color}
              onChange={(e) => {
                const updated = [...colors];
                updated[i] = e.target.value;
                setColors(updated);
              }}
              className="w-12 h-8"
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => {
                const updated = [...colors];
                updated[i] = e.target.value;
                setColors(updated);
              }}
              className="w-24 font-mono text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setColors(colors.filter((_, idx) => idx !== i))}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StringListEditor({
  label,
  addLabel,
  placeholder,
  items,
  setItems,
}: {
  label: string;
  addLabel: string;
  placeholder: string;
  items: string[];
  setItems: (items: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems([...items, ""])}
        >
          <Plus className="h-3 w-3 mr-1" />
          {addLabel}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = e.target.value;
                setItems(updated);
              }}
              placeholder={placeholder}
              className="w-48"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
