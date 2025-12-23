"use client";

import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

export function EditorLayout({
  children,
  sidebar,
  header,
  onBack,
  backLabel = "Back",
}: EditorLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}
          <div className="flex-1">{header}</div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-muted/10 overflow-y-auto">
          <div className="p-4 space-y-4">
            {sidebar}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
