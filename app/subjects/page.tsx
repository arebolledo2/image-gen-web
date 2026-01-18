"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Box, X, Tag } from "lucide-react";
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
  categoryId: string | null;
  createdAt: string;
  category?: Category;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
        const filteredSubjects = filterCategoryId === "all"
          ? subjects
          : subjects.filter(s => s.categoryId === filterCategoryId);

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map((subject) => (
              <Card
                key={subject.id}
                className="hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
                onClick={() => router.push(`/subjects/${subject.id}`)}
              >
                {subject.category && (
                  <div
                    className="absolute top-0 right-0 w-12 h-12 bg-muted transform translate-x-6 -translate-y-6 rotate-45"
                    style={{ backgroundColor: subject.category.color + '20' || '#3b82f620' }}
                  />
                )}
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CardTitle className="flex items-center gap-2">
                          <Box className="h-4 w-4" />
                          {subject.name}
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] px-1 h-4">v{subject.version}</Badge>
                        {subject.isTransparent && (
                          <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 border-pink-200 text-[10px] px-1 h-4">
                            T
                          </Badge>
                        )}
                      </div>

                      {subject.category && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5"
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

                      {subject.description && (
                        <CardDescription className="line-clamp-2 text-xs">
                          {subject.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
