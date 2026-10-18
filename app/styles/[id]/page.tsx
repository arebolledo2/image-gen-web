"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Copy, Pencil, Save, X } from "lucide-react";
import { StyleEditForm } from "@/components/styles/style-edit-form";
import { StylePaletteDisplay } from "@/components/styles/style-palette-display";
import { StyleRenderingCuesDisplay } from "@/components/styles/style-rendering-cues-display";
import { StyleLineage } from "@/components/styles/style-lineage";
import { StyleBatchesSection } from "@/components/styles/style-batches-section";
import { api } from "@/lib/api-client";
import type { ApiStyleBatch, ApiStyleDetail } from "@/lib/types/api";

export default function StyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [style, setStyle] = useState<ApiStyleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState<ApiStyleBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  // Edit state for all fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrimaryColors, setEditPrimaryColors] = useState<string[]>([]);
  const [editAccentColors, setEditAccentColors] = useState<string[]>([]);
  const [editBackground, setEditBackground] = useState("");
  const [editMaterials, setEditMaterials] = useState<string[]>([]);
  const [editEffects, setEditEffects] = useState<string[]>([]);
  const [editFinish, setEditFinish] = useState("");

  useEffect(() => {
    const fetchStyle = async () => {
      try {
        const styleData = await api.styles.get(id);
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

    const fetchBatches = async () => {
      try {
        setBatches(await api.styles.batches(id));
      } catch (error) {
        console.error("Error fetching style batches:", error);
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchStyle();
    fetchBatches();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this style?")) {
      return;
    }

    setDeleting(true);
    try {
      await api.styles.remove(id);
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
      const created = await api.styles.createVersion(id);
      router.push(`/styles/${created.id}`);
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
      const updated = await api.styles.update(id, {
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
      });
      // The PATCH response has no lineage, so keep the parent/children we already loaded
      setStyle((prev) => (prev ? { ...prev, ...updated } : prev));
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
        <StyleEditForm
          editName={editName}
          setEditName={setEditName}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editPrimaryColors={editPrimaryColors}
          setEditPrimaryColors={setEditPrimaryColors}
          editAccentColors={editAccentColors}
          setEditAccentColors={setEditAccentColors}
          editBackground={editBackground}
          setEditBackground={setEditBackground}
          editMaterials={editMaterials}
          setEditMaterials={setEditMaterials}
          editEffects={editEffects}
          setEditEffects={setEditEffects}
          editFinish={editFinish}
          setEditFinish={setEditFinish}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <StylePaletteDisplay palette={style.palette} />
        <StyleRenderingCuesDisplay renderingCues={style.renderingCues} />
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

      <StyleLineage
        parentStyle={style.parentStyle}
        childStyles={style.childStyles}
      />

      <StyleBatchesSection batches={batches} loading={loadingBatches} />
    </div>
  );
}
