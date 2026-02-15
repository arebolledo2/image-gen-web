"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StylePaletteDisplayProps {
  palette: string[] | {
    primary: string[];
    accent: string[];
    background: string;
  };
}

export function StylePaletteDisplay({ palette }: StylePaletteDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Palette</CardTitle>
        <CardDescription>Primary, accent, and background colors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.isArray(palette) ? (
          <div>
            <h4 className="text-sm font-medium mb-3">Colors</h4>
            <div className="flex flex-wrap gap-2">
              {palette.map((color, i) => (
                <ColorSwatch key={i} color={color} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="text-sm font-medium mb-3">Primary Colors</h4>
              <div className="flex flex-wrap gap-2">
                {palette.primary.map((color, i) => (
                  <ColorSwatch key={i} color={color} />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Accent Colors</h4>
              <div className="flex flex-wrap gap-2">
                {palette.accent.map((color, i) => (
                  <ColorSwatch key={i} color={color} />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-3">Background</h4>
              <ColorSwatch color={palette.background} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-md border shadow-sm"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] font-mono">{color}</span>
    </div>
  );
}
