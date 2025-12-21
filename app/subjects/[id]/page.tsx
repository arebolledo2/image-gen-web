"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Copy, Box, ChevronRight, Pencil, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Subject {
  id: string;
  name: string;
  version: number;
  description: string | null;
  createdAt: string;
  parentSubject?: {
    id: string;
    name: string;
  } | null;
  childSubjects?: {
    id: string;
    name: string;
    version: number;
  }[];
}

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/subjects/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch subject");
      }
      const data = await response.json();
      setSubject(data.subject);
      setEditName(data.subject.name);
      setEditDescription(data.subject.description || "");
    } catch (error) {
      console.error("Error fetching subject:", error);
      alert("Failed to load subject");
      router.push("/subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subject?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete subject");
      }

      router.push("/subjects");
    } catch (error) {
      console.error("Error deleting subject:", error);
      alert("Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateVersion = async () => {
    setCreatingVersion(true);
    try {
      const response = await fetch(`/api/subjects/${id}/version`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create version");
      }

      const data = await response.json();
      router.push(`/subjects/${data.subject.id}`);
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
      const response = await fetch(`/api/subjects/${id}`, {
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
      setSubject(data.subject);
      setEditing(false);
    } catch (error) {
      console.error("Error saving subject:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(subject?.name || "");
    setEditDescription(subject?.description || "");
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
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
            <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
            <Badge variant="outline">v{subject.version}</Badge>
          </div>
          <p className="text-muted-foreground">
            Created {new Date(subject.createdAt).toLocaleDateString()}
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
          <CardTitle>{editing ? "Edit Subject" : "Description"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Subject name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Subject description"
                  rows={4}
                />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {subject.description || "No description provided."}
            </p>
          )}
        </CardContent>
      </Card>

      {(subject.parentSubject || (subject.childSubjects && subject.childSubjects.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Lineage</CardTitle>
            <CardDescription>Related versions and parent subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subject.parentSubject && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Parent Subject</h4>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push(`/subjects/${subject.parentSubject!.id}`)}
                >
                  <span className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    {subject.parentSubject.name}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {subject.childSubjects && subject.childSubjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Child Subjects</h4>
                <div className="grid gap-2">
                  {subject.childSubjects.map((child) => (
                    <Button
                      key={child.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => router.push(`/subjects/${child.id}`)}
                    >
                      <span className="flex items-center gap-2">
                        <Box className="h-4 w-4" />
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
