"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Copy, Sparkles, ChevronRight, Pencil, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Guidance {
  id: string;
  name: string;
  version: number;
  description: string;
  createdAt: string;
  parentGuidance?: {
    id: string;
    name: string;
  } | null;
  childGuidances?: {
    id: string;
    name: string;
    version: number;
  }[];
}

export default function GuidanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchGuidance();
  }, [id]);

  const fetchGuidance = async () => {
    try {
      const response = await fetch(`/api/guidance/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch guidance");
      }
      const data = await response.json();
      setGuidance(data.guidance);
      setEditName(data.guidance.name);
      setEditDescription(data.guidance.description);
    } catch (error) {
      console.error("Error fetching guidance:", error);
      alert("Failed to load guidance");
      router.push("/guidance");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this guidance?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/guidance/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete guidance");
      }

      router.push("/guidance");
    } catch (error) {
      console.error("Error deleting guidance:", error);
      alert("Failed to delete guidance");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateVersion = async () => {
    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/guidance/${id}/version`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create version");
      }

      const data = await response.json();
      router.push(`/guidance/${data.guidance.id}`);
    } catch (error) {
      console.error("Error creating version:", error);
      alert("Failed to create version");
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/guidance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      const data = await response.json();
      setGuidance(data.guidance);
      setEditing(false);
    } catch (error) {
      console.error("Error saving guidance:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(guidance?.name || "");
    setEditDescription(guidance?.description || "");
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guidance) {
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
            <h1 className="text-3xl font-bold tracking-tight">{guidance.name}</h1>
            <Badge variant="outline">v{guidance.version}</Badge>
          </div>
          <p className="text-muted-foreground">
            Created {new Date(guidance.createdAt).toLocaleDateString()}
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

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Guidance" : "Description"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Guidance name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Guidance description"
                  rows={4}
                />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {guidance.description}
            </p>
          )}
        </CardContent>
      </Card>

      {(guidance.parentGuidance || (guidance.childGuidances && guidance.childGuidances.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Guidance Lineage</CardTitle>
            <CardDescription>Related versions and parent guidance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {guidance.parentGuidance && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Guidance</h4>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/guidance/${guidance.parentGuidance!.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {guidance.parentGuidance.name}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {guidance.childGuidances && guidance.childGuidances.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Guidance</h4>
                <div className="grid gap-2">
                  {guidance.childGuidances.map((child) => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => router.push(`/guidance/${child.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
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
