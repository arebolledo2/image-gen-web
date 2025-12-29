"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Palette, ChevronRight, Copy, Pencil, Save, X, Plus, Sparkles } from "lucide-react";
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

interface Style {
  id: string;
  name: string;
  version: number;
  description: string | null;
  palette: string[] | {
    primary: string[];
    accent: string[];
    background: string;
  };
  renderingCues: string[] | {
    materials: string[];
    effects: string[];
    finish: string;
  };
  createdAt: string;
  parentStyle?: {
    id: string;
    name: string;
  } | null;
  childStyles?: {
    id: string;
    name: string;
    version: number;
  }[];
}

export default function StyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [style, setStyle] = useState<Style | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state for all fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrimaryColors, setEditPrimaryColors] = useState<string[]>([]);
  const [editAccentColors, setEditAccentColors] = useState<string[]>([]);
  const [editBackground, setEditBackground] = useState("");
  const [editMaterials, setEditMaterials] = useState<string[]>([]);
  const [editEffects, setEditEffects] = useState<string[]>([]);
  const [editFinish, setEditFinish] = useState("");

  // AI Assist state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchStyle();
  }, [id]);

  const fetchStyle = async () => {
    try {
      const response = await fetch(`/api/styles/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch style");
      }
      const data = await response.json();
      const styleData = data.style;
      setStyle(styleData);

      // Initialize edit state
      setEditName(styleData.name);
      setEditDescription(styleData.description || "");

      if (!Array.isArray(styleData.palette)) {
        setEditPrimaryColors(styleData.palette.primary || []);
        setEditAccentColors(styleData.palette.accent || []);
        setEditBackground(styleData.palette.background || "#ffffff");
      }

      if (!Array.isArray(styleData.renderingCues)) {
        setEditMaterials(styleData.renderingCues.materials || []);
        setEditEffects(styleData.renderingCues.effects || []);
        setEditFinish(styleData.renderingCues.finish || "");
      }
    } catch (error) {
      console.error("Error fetching style:", error);
      toast.error("Failed to load style");
      router.push("/styles");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this style?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/styles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete style");
      }

      router.push("/styles");
    } catch (error) {
      console.error("Error deleting style:", error);
      toast.error("Failed to delete style");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateVersion = async () => {
    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/styles/${id}/version`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create version");
      }

      const data = await response.json();
      router.push(`/styles/${data.style.id}`);
    } catch (error) {
      console.error("Error creating version:", error);
      toast.error("Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/styles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      const data = await response.json();
      setStyle(data.style);
      toast.success("Style updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Error saving style:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (style) {
      setEditName(style.name);
      setEditDescription(style.description || "");
      if (!Array.isArray(style.palette)) {
        setEditPrimaryColors(style.palette.primary || []);
        setEditAccentColors(style.palette.accent || []);
        setEditBackground(style.palette.background || "#ffffff");
      }
      if (!Array.isArray(style.renderingCues)) {
        setEditMaterials(style.renderingCues.materials || []);
        setEditEffects(style.renderingCues.effects || []);
        setEditFinish(style.renderingCues.finish || "");
      }
    }
    setEditing(false);
  };

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

      // Update edit state with AI suggestions
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!style) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{style.name}</h1>
            <Badge variant="outline">v{style.version}</Badge>
          </div>
          <p className="text-muted-foreground">
            Created {new Date(style.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleCreateVersion} disabled={creatingVersion}>
                {creatingVersion ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Create Version
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Primary Colors</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditPrimaryColors([...editPrimaryColors, "#000000"])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Color
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editPrimaryColors.map((color, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const updated = [...editPrimaryColors];
                            updated[i] = e.target.value;
                            setEditPrimaryColors(updated);
                          }}
                          className="w-12 h-8"
                        />
                        <Input
                          type="text"
                          value={color}
                          onChange={(e) => {
                            const updated = [...editPrimaryColors];
                            updated[i] = e.target.value;
                            setEditPrimaryColors(updated);
                          }}
                          className="w-24 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditPrimaryColors(editPrimaryColors.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Accent Colors</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditAccentColors([...editAccentColors, "#000000"])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Color
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editAccentColors.map((color, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded">
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const updated = [...editAccentColors];
                            updated[i] = e.target.value;
                            setEditAccentColors(updated);
                          }}
                          className="w-12 h-8"
                        />
                        <Input
                          type="text"
                          value={color}
                          onChange={(e) => {
                            const updated = [...editAccentColors];
                            updated[i] = e.target.value;
                            setEditAccentColors(updated);
                          }}
                          className="w-24 font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditAccentColors(editAccentColors.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

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
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Materials</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMaterials([...editMaterials, ""])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Material
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editMaterials.map((material, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={material}
                          onChange={(e) => {
                            const updated = [...editMaterials];
                            updated[i] = e.target.value;
                            setEditMaterials(updated);
                          }}
                          placeholder="e.g., glass, metal, wood"
                          className="w-48"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMaterials(editMaterials.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Effects</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditEffects([...editEffects, ""])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Effect
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editEffects.map((effect, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={effect}
                          onChange={(e) => {
                            const updated = [...editEffects];
                            updated[i] = e.target.value;
                            setEditEffects(updated);
                          }}
                          placeholder="e.g., glow, shadow, blur"
                          className="w-48"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditEffects(editEffects.filter((_, idx) => idx !== i))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

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
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Primary, accent, and background colors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.isArray(style.palette) ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {style.palette.map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 h-12 rounded-md border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-mono">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">Primary Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.palette.primary.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded-md border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Accent Colors</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.palette.accent.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-12 h-12 rounded-md border shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[10px] font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Background</h4>
                  <div className="flex flex-col items-start gap-1">
                    <div
                      className="w-12 h-12 rounded-md border shadow-sm"
                      style={{ backgroundColor: style.palette.background }}
                    />
                    <span className="text-[10px] font-mono">{style.palette.background}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rendering Cues</CardTitle>
            <CardDescription>Materials, effects, and finish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.isArray(style.renderingCues) ? (
              <div>
                <h4 className="text-sm font-medium mb-3">Rendering Cues</h4>
                <div className="flex flex-wrap gap-2">
                  {style.renderingCues.map((cue) => (
                    <Badge key={cue} variant="secondary">
                      {cue}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3">Materials</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.renderingCues.materials.map((material) => (
                      <Badge key={material} variant="secondary">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Effects</h4>
                  <div className="flex flex-wrap gap-2">
                    {style.renderingCues.effects.map((effect) => (
                      <Badge key={effect} variant="outline">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Finish</h4>
                  <Badge>{style.renderingCues.finish}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {style.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {(style.parentStyle || (style.childStyles && style.childStyles.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Style Lineage</CardTitle>
            <CardDescription>Related versions and parent styles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {style.parentStyle && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Style</h4>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/styles/${style.parentStyle!.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {style.parentStyle.name}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {style.childStyles && style.childStyles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Styles</h4>
                <div className="grid gap-2">
                  {style.childStyles.map((child) => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => router.push(`/styles/${child.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        {child.name}
                        <Badge variant="secondary" className="text-[10px]">v{child.version}</Badge>
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
