"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StyleRenderingCuesDisplayProps {
  renderingCues: string[] | {
    materials: string[];
    effects: string[];
    finish: string;
  };
}

export function StyleRenderingCuesDisplay({ renderingCues }: StyleRenderingCuesDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendering Cues</CardTitle>
        <CardDescription>Materials, effects, and finish</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.isArray(renderingCues) ? (
          <div>
            <h4 className="text-sm font-medium mb-3">Rendering Cues</h4>
            <div className="flex flex-wrap gap-2">
              {renderingCues.map((cue) => (
                <Badge key={cue} variant="secondary">
                  {cue}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-sm font-medium mb-3">Materials</h4>
              <div className="flex flex-wrap gap-2">
                {renderingCues.materials.map((material) => (
                  <Badge key={material} variant="secondary">
                    {material}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Effects</h4>
              <div className="flex flex-wrap gap-2">
                {renderingCues.effects.map((effect) => (
                  <Badge key={effect} variant="outline">
                    {effect}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Finish</h4>
              <Badge>{renderingCues.finish}</Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
