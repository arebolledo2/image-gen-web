"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit2, Check, X } from "lucide-react";
import { AIAssistButton } from "@/components/agents/ai-assist-button";
import { toast } from "sonner";

interface BatchPrompt {
  id: string;
  promptText: string;
}

interface BatchPromptsListProps {
  prompts: BatchPrompt[];
  batchStatus: string;
  onPromptUpdate: (promptId: string, newText: string) => Promise<void>;
  onAdjustPrompt: (promptId: string, suggestion: string, currentText: string) => Promise<string>;
}

export const BatchPromptsList = memo(function BatchPromptsList({
  prompts,
  batchStatus,
  onPromptUpdate,
  onAdjustPrompt,
}: BatchPromptsListProps) {
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);

  const handleEditPrompt = (prompt: BatchPrompt) => {
    setEditingPromptId(prompt.id);
    setEditPromptText(prompt.promptText);
  };

  const handleSavePrompt = async (promptId: string) => {
    setSavingPrompt(true);
    try {
      await onPromptUpdate(promptId, editPromptText);
      setEditingPromptId(null);
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleAdjustPrompt = async (promptId: string, suggestion: string) => {
    const adjustedText = await onAdjustPrompt(promptId, suggestion, editPromptText);
    setEditPromptText(adjustedText);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompts</CardTitle>
        <CardDescription>
          {prompts.length} prompt(s) in this batch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.map((prompt, index) => (
          <Card key={prompt.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Prompt {index + 1}</CardTitle>
              {batchStatus === 'draft' && editingPromptId !== prompt.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPrompt(prompt)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingPromptId === prompt.id ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <AIAssistButton
                      label="AI Adjust"
                      title="Adjust Prompt"
                      description="Make a quick suggestion to adjust this prompt."
                      placeholder="e.g., make it more futuristic, add more blue..."
                      onGenerate={(suggestion) => handleAdjustPrompt(prompt.id, suggestion)}
                    />
                  </div>
                  <Textarea
                    value={editPromptText}
                    onChange={(e) => setEditPromptText(e.target.value)}
                    className="min-h-[100px] text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPromptId(null)}
                      disabled={savingPrompt}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSavePrompt(prompt.id)}
                      disabled={savingPrompt}
                    >
                      {savingPrompt ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{prompt.promptText}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
});
