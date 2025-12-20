import { Card, CardContent } from "@/components/ui/card";

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
        <p className="text-muted-foreground">
          Manage your prompt templates
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Prompt template management coming in Phase 3!
            </p>
          </CardContent>
        </CardContent>
      </Card>
    </div>
  );
}
