import { Card, CardContent } from "@/components/ui/card";

export default function StylesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Styles</h1>
        <p className="text-muted-foreground">
          Manage your art styles and versions
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Style management coming in Phase 3!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
