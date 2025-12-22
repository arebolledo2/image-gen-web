"use client";

import * as React from "react";
import { Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings, PromptStyle } from "@/components/providers/settings-provider";

export function SettingsToggle() {
  const { promptStyle, setPromptStyle } = useSettings();

  const styles: { value: PromptStyle; label: string; description: string }[] = [
    { 
      value: "terse", 
      label: "Terse", 
      description: "Brief descriptions with lots of commas" 
    },
    { 
      value: "verbose", 
      label: "Verbose", 
      description: "Full sentences with periods and new lines" 
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Prompt Settings">
          <Settings2 className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle prompt style</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Prompt Generation Style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {styles.map((style) => (
          <DropdownMenuItem
            key={style.value}
            className="flex flex-col items-start gap-1 py-3"
            onClick={() => setPromptStyle(style.value)}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-medium">{style.label}</span>
              {promptStyle === style.value && <Check className="h-4 w-4" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {style.description}
            </p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
