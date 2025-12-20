"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

interface AIAssistButtonProps {
  onGenerate: (description: string) => Promise<void>;
  label?: string;
  title: string;
  description: string;
  placeholder: string;
  buttonVariant?: "default" | "outline" | "secondary";
}

export function AIAssistButton({
  onGenerate,
  label = "AI Assist",
  title,
  description,
  placeholder,
  buttonVariant = "outline",
}: AIAssistButtonProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      await onGenerate(input);
      setOpen(false);
      setInput("");
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} type="button">
          <Sparkles className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ai-input">Description</Label>
            <Textarea
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerate}
            disabled={loading || !input.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
