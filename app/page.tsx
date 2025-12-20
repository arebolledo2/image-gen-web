import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Layers, Palette, FileText, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          AI-Powered Sprite & Asset Generator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Generate game sprites and spritesheets with AI. Manage styles, create batches, and build your asset library.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <ImageIcon className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Gallery</CardTitle>
            <CardDescription>
              Browse all your generated images
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/gallery">
              <Button className="w-full">View Gallery</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Layers className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Batches</CardTitle>
            <CardDescription>
              Create and manage generation batches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/batches">
              <Button className="w-full">Manage Batches</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Palette className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Styles</CardTitle>
            <CardDescription>
              Define and version your art styles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/styles">
              <Button className="w-full">Manage Styles</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Prompts</CardTitle>
            <CardDescription>
              Build reusable prompt templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prompts">
              <Button className="w-full">Manage Prompts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle>AI Assistance</CardTitle>
          </div>
          <CardDescription>
            Use AI agents to create styles, generate prompts, and get suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Our AI agents powered by Gemini Flash 3.0 can help you create professional styles,
            generate optimized prompts, and suggest variations for your assets.
          </p>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Powered by Gemini 2.5 Flash Image Preview</p>
      </div>
    </div>
  );
}
