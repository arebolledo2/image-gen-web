"use client";

import { useEffect, useState, use } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trash2, Copy, Box, ChevronRight, Pencil, Save, X, Tag, ImageIcon, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import type { ApiSubjectCategory, ApiSubjectDetail, ApiSubjectImage } from "@/lib/types/api";

type Category = ApiSubjectCategory;
/** A subject with its category attached for display */
type Subject = ApiSubjectDetail & { category?: Category };


export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsTransparent, setEditIsTransparent] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
  const [images, setImages] = useState<ApiSubjectImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sub, cats] = await Promise.all([
          api.subjects.get(id),
          api.subjectCategories.list(),
        ]);

        setCategories(cats);
        setSubject({
          ...sub,
          category: cats.find((c) => c.id === sub.categoryId)
        });

        setEditName(sub.name);
        setEditDescription(sub.description || "");
        setEditIsTransparent(sub.isTransparent);
        setSelectedCategoryId(sub.categoryId || "none");
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load subject");
        router.push("/subjects");
      } finally {
        setLoading(false);
      }
    };

    const fetchImages = async () => {
      try {
        setImages(await api.subjects.images(id));
      } catch (error) {
        console.error("Error fetching subject images:", error);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchData();
    fetchImages();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this subject?")) {
      return;
    }

    setDeleting(true);
    try {
      await api.subjects.remove(id);
      router.push("/subjects");
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateVersion = async () => {
    setCreatingVersion(true);
    try {
      const created = await api.subjects.createVersion(id);
      router.push(`/subjects/${created.id}`);
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
      const updatedSub = await api.subjects.update(id, {
        name: editName,
        description: editDescription,
        isTransparent: editIsTransparent,
        categoryId: selectedCategoryId === "none" ? null : selectedCategoryId
      });
      // The PATCH response has no lineage, so keep the parent/children we already loaded
      setSubject((prev) => prev && {
        ...prev,
        ...updatedSub,
        category: categories.find(c => c.id === updatedSub.categoryId)
      });
      toast.success("Subject updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(subject?.name || "");
    setEditDescription(subject?.description || "");
    setEditIsTransparent(subject?.isTransparent ?? true);
    setSelectedCategoryId(subject?.categoryId || "none");
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
            <Badge variant="outline">v{subject.version}</Badge>
            {subject.isTransparent && (
              <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-200">
                Transparent
              </Badge>
            )}
            {subject.category && (
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: subject.category.color + '20' || '#3b82f620',
                  color: subject.category.color || '#3b82f6',
                  borderColor: subject.category.color + '40' || '#3b82f640'
                }}
              >
                <Tag className="mr-1 h-3 w-3" />
                {subject.category.name}
              </Badge>
            )}
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
          <CardTitle>{editing ? "Edit Subject" : "Details"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Subject name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger id="editCategory">
                      <SelectValue placeholder="Select Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <Textarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Subject description"
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="editIsTransparent"
                    checked={editIsTransparent}
                    onCheckedChange={setEditIsTransparent}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="editIsTransparent">Transparent Background</Label>
                    <p className="text-[10px] text-muted-foreground">
                      ALWAYS include magenta background for sprite transparency
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {subject.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1 text-muted-foreground uppercase tracking-wider">Description</h4>
                  <p className="text-sm whitespace-pre-wrap">{subject.description}</p>
                </div>
              )}
              {!subject.description && <p className="text-sm text-muted-foreground italic">No description provided.</p>}
            </div>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Image Gallery</CardTitle>
              <CardDescription>Images generated for this subject</CardDescription>
            </div>
            <Badge variant="secondary">{images.length} Images</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingImages ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No images found for this subject.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
                  onClick={() => router.push(`/editor/${img.id}`)}
                >
                  <Image
                    src={`/api/images/${img.id}/file`}
                    alt={subject.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className="object-cover transition-transform group-hover:scale-110"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <p className="text-[10px] text-white font-medium line-clamp-2 mb-1">
                      {img.generation.batch.name}
                    </p>
                    <div className="flex gap-2">
                      <Button size="icon" variant="secondary" className="h-7 w-7">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
