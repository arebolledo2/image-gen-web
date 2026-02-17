"use client";

import { ReactNode } from "react";

interface ComposerLayoutProps {
  picker: ReactNode;
  canvas: ReactNode;
  panel: ReactNode;
  toolbar: ReactNode;
  showPicker: boolean;
  showPanel: boolean;
}

export function ComposerLayout({
  picker,
  canvas,
  panel,
  toolbar,
  showPicker,
  showPanel,
}: ComposerLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b px-4 py-2 flex items-center gap-4 bg-card">
        {toolbar}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {showPicker && (
          <div className="w-72 border-r bg-card overflow-y-auto">{picker}</div>
        )}
        <div className="flex-1 overflow-hidden">{canvas}</div>
        {showPanel && (
          <div className="w-64 border-l bg-card overflow-y-auto">{panel}</div>
        )}
      </div>
    </div>
  );
}
