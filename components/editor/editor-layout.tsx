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
        <div className="flex items-center gap-4 p-4 min-w-0 overflow-hidden">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          )}
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 border-r bg-muted/10 overflow-hidden">
          <div className="h-full p-4">
            {sidebar}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
