"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X, Wand2 } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { DEFAULT_RESOLUTION, getResolutionPresetsForProvider, type ProviderType } from "@/lib/config/resolution-presets";
import { useSettings } from "@/components/providers/settings-provider";
import { toast } from "sonner";
import { ConstructModeSelector, type StyleEntity, type SubjectEntity, type GuidanceEntity } from "@/components/batch/construct-mode-selector";
import { BatchDefaultsForm } from "@/components/batch/batch-defaults-form";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface BatchPrompt {
  promptText: string;
  promptId?: string;
  overrides?: {
    count?: number;
  };
}

export default function NewBatchPage() {
  const router = useRouter();
  const { promptStyle } = useSettings();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [styles, setStyles] = useState<StyleEntity[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guidanceList, setGuidanceList] = useState<GuidanceEntity[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [stylesFavoritesOnly, setStylesFavoritesOnly] = useState(false);
  const [subjectsFavoritesOnly, setSubjectsFavoritesOnly] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<ProviderType>('gemini');
  const [defaultCount, setDefaultCount] = useState(1);
  const [resolution, setResolution] = useState<string>(DEFAULT_RESOLUTION);

  const availableResolutions = getResolutionPresetsForProvider(provider);

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const newAvailableResolutions = getResolutionPresetsForProvider(newProvider);
    const currentResolutionSupported = newAvailableResolutions.some(r => r.id === resolution);
    if (!currentResolutionSupported) {
      setResolution(DEFAULT_RESOLUTION);
    }
  };

  const [styleId, setStyleId] = useState("");
  const [omitStyle, setOmitStyle] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedGuidanceIds, setSelectedGuidanceIds] = useState<string[]>([]);

  const [composing, setComposing] = useState(false);
  const [previewPrompts, setPreviewPrompts] = useState<{ subjectName: string; promptText: string; promptId?: string }[]>([]);
  const [prompts, setPrompts] = useState<BatchPrompt[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stylesRes, subjectsRes, categoriesRes, guidanceRes] = await Promise.all([
        fetch('/api/styles'),
        fetch('/api/subjects'),
        fetch('/api/subject-categories'),
        fetch('/api/guidance'),
      ]);
      const [stylesData, subjectsData, categoriesData, guidanceData] = await Promise.all([
        stylesRes.json(),
        subjectsRes.json(),
        categoriesRes.json(),
        guidanceRes.json(),
      ]);
      setStyles(stylesData.styles || []);
      setSubjects(subjectsData.subjects || []);
      setCategories(categoriesData.categories || []);
      setGuidanceList(guidanceData.guidance || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const toggleGuidance = (id: string) => {
    setSelectedGuidanceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConstructPreview = async () => {
    if ((!omitStyle && !styleId) || selectedSubjectIds.length === 0) return;
    setComposing(true);
    try {
      const promises = selectedSubjectIds.map(async (subId) => {
        const subject = subjects.find(s => s.id === subId);
        const response = await fetch('/api/agents/compose-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleId: omitStyle ? undefined : styleId,
            subjectId: subId,
            guidanceIds: selectedGuidanceIds,
            promptStyle
          })
        });
        const data = await response.json();
        return {
          subjectName: subject?.name || 'Unknown',
          promptText: data.promptText,
          promptId: data.promptId
        };
      });

      const results = await Promise.all(promises);
      setPreviewPrompts(results);
    } catch (error) {
      console.error('Error composing prompts:', error);
    } finally {
      setComposing(false);
    }
  };

  const addToBatch = (index?: number) => {
    if (index !== undefined) {
      const preview = previewPrompts[index];
      setPrompts([...prompts, { promptText: preview.promptText, promptId: preview.promptId }]);
      setPreviewPrompts(prev => prev.filter((_, i) => i !== index));
    } else {
      const newPrompts = previewPrompts.map(p => ({
        promptText: p.promptText,
        promptId: p.promptId
      }));
      setPrompts([...prompts, ...newPrompts]);
      setPreviewPrompts([]);
    }
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleEditPreview = (index: number, newText: string) => {
    setPreviewPrompts(prev => prev.map((p, i) => i === index ? { ...p, promptText: newText } : p));
  };

  const handleAdjustPreview = async (index: number, suggestion: string) => {
    const preview = previewPrompts[index];
    const response = await fetch('/api/agents/adjust-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basePrompt: preview.promptText,
        suggestion,
        promptStyle
      })
    });

    if (!response.ok) throw new Error('Failed to adjust prompt');
    const data = await response.json();
    handleEditPreview(index, data.promptText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          provider,
          defaults: {
            count: defaultCount,
            resolution: resolution,
          },
          prompts: prompts,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create batch');
      }

      const data = await response.json();
      toast.success('Batch created successfully! Generations started.');
      router.push(`/batches/${data.batch.id}`);
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Batch</h1>
        <p className="text-muted-foreground">
          Set up a new batch of image generations using constructed prompts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Construct Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>1. Construct Prompt</CardTitle>
            <CardDescription>Build a prompt from building blocks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ConstructModeSelector
              styles={styles}
              subjects={subjects}
              categories={categories}
              guidanceList={guidanceList}
              styleId={styleId}
              setStyleId={setStyleId}
              omitStyle={omitStyle}
              setOmitStyle={setOmitStyle}
              selectedSubjectIds={selectedSubjectIds}
              toggleSubject={toggleSubject}
              selectedGuidanceIds={selectedGuidanceIds}
              toggleGuidance={toggleGuidance}
              filterCategoryId={filterCategoryId}
              setFilterCategoryId={setFilterCategoryId}
              stylesFavoritesOnly={stylesFavoritesOnly}
              setStylesFavoritesOnly={setStylesFavoritesOnly}
              subjectsFavoritesOnly={subjectsFavoritesOnly}
              setSubjectsFavoritesOnly={setSubjectsFavoritesOnly}
            />

            <Button
              type="button"
              className="w-full"
              onClick={handleConstructPreview}
              disabled={composing || ((!omitStyle && !styleId) || selectedSubjectIds.length === 0)}
            >
              {composing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {`Construct Previews (${selectedSubjectIds.length})`}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Preview and Add to Batch */}
        {previewPrompts.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">2. Preview Constructed Prompts ({previewPrompts.length})</CardTitle>
              <Button type="button" size="sm" onClick={() => addToBatch()} className="h-8">
                <Plus className="mr-2 h-4 w-4" /> Add All to Batch
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {previewPrompts.map((p, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-background border rounded-lg group">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {p.subjectName}
                        </div>
                        <AIAssistButton
                          label="Adjust"
                          title="Adjust Prompt"
                          description="Make a quick suggestion to adjust this prompt."
                          placeholder="e.g., make it more futuristic, add more blue..."
                          onGenerate={(suggestion) => handleAdjustPreview(index, suggestion)}
                        />
                      </div>
                      <Textarea
                        value={p.promptText}
                        onChange={(e) => handleEditPreview(index, e.target.value)}
                        className="text-sm italic text-muted-foreground min-h-[80px] bg-muted/30"
                        placeholder="Edit prompt..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => addToBatch(index)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setPreviewPrompts(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Batch Selection and Metadata */}
        {prompts.length > 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3. Selected Prompts ({prompts.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {prompts.map((p, index) => (
                  <div key={index} className="flex gap-4 p-3 border rounded-lg relative group">
                    <div className="flex-1 text-sm text-muted-foreground italic">
                      {p.promptText}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removePrompt(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <BatchDefaultsForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              provider={provider}
              onProviderChange={handleProviderChange}
              resolution={resolution}
              setResolution={setResolution}
              availableResolutions={availableResolutions}
              defaultCount={defaultCount}
              setDefaultCount={setDefaultCount}
              promptTexts={prompts.map(p => p.promptText)}
            />

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || !name}
                className="flex-1 h-12 text-lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Batch & Start Generations
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
