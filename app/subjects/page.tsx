"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Box, X, Tag, Star, Trash2 } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
}

interface Subject {
  id: string;
  name: string;
  version: number;
  description: string | null;
  isTransparent: boolean;
  isFavorite: boolean;
  categoryId: string | null;
  createdAt: string;
  category?: Category;
  previews?: { id: string }[];
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // New Subject Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isTransparent, setIsTransparent] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  // Category Management State
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#3b82f6");
  const [newCatDescription, setNewCatDescription] = useState("");
  const [catSubmitting, setCatSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, categoriesRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/subject-categories')
      ]);

      const subjectsData = await subjectsRes.json();
      const categoriesData = await categoriesRes.json();

      const cats = categoriesData.categories || [];
      setCategories(cats);

      // Map categories to subjects for display
      const subjectsWithCats = (subjectsData.subjects || []).map((s: Subject) => ({
        ...s,
        category: cats.find((c: Category) => c.id === s.categoryId)
      }));

      setSubjects(subjectsWithCats);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      const updatedSubjects = (data.subjects || []).map((s: Subject) => ({
        ...s,
        category: categories.find(c => c.id === s.categoryId)
      }));
      setSubjects(updatedSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          isTransparent,
          categoryId: selectedCategoryId === "none" ? null : selectedCategoryId
        }),
      });
      if (response.ok) {
        setNewName("");
        setNewDescription("");
        setIsTransparent(true);
        setSelectedCategoryId("none");
        setShowNewForm(false);
        toast.success("Subject created successfully");
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error creating subject:', error);
      toast.error("Failed to create subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    setCatSubmitting(true);
    try {
      const response = await fetch('/api/subject-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          color: newCatColor,
          description: newCatDescription
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories([...categories, data.category]);
        setNewCatName("");
        setNewCatDescription("");
        toast.success("Category created");
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error("Failed to create category");
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? Subjects in this category will become uncategorized.")) return;

    try {
      const response = await fetch(`/api/subject-categories/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id));
        toast.success("Category deleted");
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error("Failed to delete category");
    }
  };

  const handleAiAssist = async (concept: string) => {
    try {
      const response = await fetch('/api/agents/create-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subject) {
          setNewName(data.subject.name);
          setNewDescription(data.subject.description);
        }
      }
    } catch (error) {
      console.error('Error with AI assist:', error);
      throw error;
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/subjects/${subjectId}/favorite`, {
        method: 'PATCH',
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(subjects.map(s =>
          s.id === subjectId ? { ...s, isFavorite: data.subject.isFavorite } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("Failed to update favorite");
    }
  };

  const handleDelete = async (e: React.MouseEvent, subjectId: string, subjectName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete subject "${subjectName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subject');
      }

      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      toast.success('Subject deleted');
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">
            Manage entities you want to generate (e.g., enemy, turret)
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Category Filter */}
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="icon"
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            aria-label="Toggle favorites"
            className={favoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
          >
            <Star className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`} />
          </Button>
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Manage Subject Categories</DialogTitle>
                <DialogDescription>
                  Group your subjects into categories for better organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <form onSubmit={handleCreateCategory} className="space-y-4 border-b pb-6">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="catName" className="text-right text-xs">Name</Label>
                    <Input
                      id="catName"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="col-span-3 h-8 text-sm"
                      placeholder="e.g., Vehicles"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="catColor" className="text-right text-xs">Color</Label>
                    <div className="col-span-3 flex gap-2 items-center">
                      <Input
                        id="catColor"
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-12 h-8 p-1 cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground">{newCatColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={catSubmitting}>
                      {catSubmitting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                      Add Category
                    </Button>
                  </div>
                </form>

                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Existing Categories</Label>
                  {categories.length === 0 ? (
                    <p className="text-sm text-center py-4 text-muted-foreground">No categories yet.</p>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border group">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                          <span className="text-sm font-medium">{cat.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Subject
          </Button>
        </div>
      </div>

      {showNewForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Subject</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="name">Name</Label>
                      <AIAssistButton
                        onGenerate={handleAiAssist}
                        title="AI Subject Generator"
                        description="Describe your subject concept and AI will generate a detailed name and description"
                        placeholder="e.g., mechanical spider, cyberpunk samurai, glowing jellyfish"
                        buttonVariant="outline"
                      />
                    </div>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Spider Tank"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground italic">AI uses this as the primary subject name</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger id="category">
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
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief description of the subject..."
                    />
                    <p className="text-[10px] text-muted-foreground italic">AI uses this to add specific details and features to the subject</p>
                  </div>

                  <div className="flex items-center space-x-2 py-2">
                    <Switch
                      id="isTransparent"
                      checked={isTransparent}
                      onCheckedChange={setIsTransparent}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="isTransparent">Transparent Background</Label>
                      <p className="text-[10px] text-muted-foreground">
                        ALWAYS include magenta background for sprite transparency
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Subject
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {(() => {
        let filteredSubjects = filterCategoryId === "all"
          ? subjects
          : subjects.filter(s => s.categoryId === filterCategoryId);

        if (favoritesOnly) {
          filteredSubjects = filteredSubjects.filter(s => s.isFavorite);
        }

        if (filteredSubjects.length === 0) {
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {subjects.length === 0
                      ? "No subjects yet. Create your first subject to get started!"
                      : "No subjects in this category."}
                  </p>
                  {subjects.length === 0 && (
                    <Button onClick={() => setShowNewForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Subject
                    </Button>
                  )}
                  {subjects.length > 0 && filterCategoryId !== "all" && (
                    <Button variant="outline" onClick={() => setFilterCategoryId("all")}>
                      Show All Subjects
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => {
              const previewImages = subject.previews?.slice(0, 3) || [];

              return (
                <Card key={subject.id} className="hover:shadow-md transition-shadow overflow-hidden flex flex-col group">
                  <Link href={`/subjects/${subject.id}`} className="block">
                    <div className="aspect-[16/9] bg-muted relative flex border-b">
                      {previewImages.length > 0 ? (
                        <div className="flex w-full h-full">
                          {previewImages.map((img) => (
                            <div
                              key={img.id}
                              className="relative flex-1 border-r last:border-r-0 overflow-hidden"
                            >
                              <Image
                                src={`/api/images/${img.id}/file?size=thumbnail`}
                                alt={subject.name}
                                fill
                                sizes="(max-width: 768px) 33vw, 15vw"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                          <Box className="h-10 w-10 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-0">
                          v{subject.version}
                        </Badge>
                        {subject.isTransparent && (
                          <Badge variant="secondary" className="bg-pink-500 text-white border-0">
                            Transparent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                  <CardHeader className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg truncate">
                        <Link href={`/subjects/${subject.id}`} className="hover:underline flex items-center gap-2">
                          <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {subject.name}
                        </Link>
                      </CardTitle>
                    </div>
                    {subject.category && (
                      <div className="pb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5"
                          style={{
                            color: subject.category.color || '#3b82f6',
                            borderColor: subject.category.color + '40' || '#3b82f640'
                          }}
                        >
                          <Tag className="mr-1 h-3 w-3" />
                          {subject.category.name}
                        </Badge>
                      </div>
                    )}
                    {subject.description && (
                      <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                        {subject.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0 mt-auto">
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1 text-[10px]">
                        {new Date(subject.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(e, subject.id, subject.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleToggleFavorite(e, subject.id)}
                        >
                          <Star className={`h-4 w-4 ${subject.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
