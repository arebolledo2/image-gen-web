"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsToggle } from "@/components/settings-toggle";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/gallery", label: "Gallery" },
  { href: "/chat", label: "Chat" },
  { href: "/batches", label: "Batches" },
  { href: "/audio-gallery", label: "Audio Gallery" },
  { href: "/audio-batches", label: "Audio Batches" },
  { href: "/styles", label: "Styles" },
  { href: "/subjects", label: "Subjects" },
  { href: "/guidance", label: "Guidance" },
  { href: "/prompts", label: "Prompts" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>Image Gen</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              AI-Powered Sprite Generator
            </div>
            <SettingsToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
