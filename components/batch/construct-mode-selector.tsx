"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Palette, Box, Compass, EyeOff, Star, ChevronDown } from "lucide-react";

export interface StyleEntity {
  id: string;
  name: string;
  isFavorite?: boolean;
  description?: string | null;
  palette?: {
    primary?: string[];
    accent?: string[];
    background?: string;
  } | null;
  renderingCues?: {
    materials?: string[];
    effects?: string[];
    finish?: string;
  } | null;
}

export interface SubjectEntity {
  id: string;
  name: string;
  isFavorite: boolean;
  isTransparent: boolean;
  categoryId: string | null;
  description?: string | null;
}

export interface GuidanceEntity {
  id: string;
  name: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface ConstructModeSelectorProps {
  styles: StyleEntity[];
  subjects: SubjectEntity[];
  categories: Category[];
  guidanceList: GuidanceEntity[];
  styleId: string;
  setStyleId: (id: string) => void;
  omitStyle: boolean;
  setOmitStyle: (omit: boolean) => void;
  selectedSubjectIds: string[];
  toggleSubject: (id: string) => void;
  selectedGuidanceIds: string[];
  toggleGuidance: (id: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  stylesFavoritesOnly: boolean;
  setStylesFavoritesOnly: (val: boolean) => void;
  subjectsFavoritesOnly: boolean;
  setSubjectsFavoritesOnly: (val: boolean) => void;
}

function StyleDetailPanel({ style }: { style: StyleEntity }) {
  const { description, palette, renderingCues } = style;
  const hasContent = description || palette || renderingCues;
  if (!hasContent) return null;

  return (
    <div className="mt-2 p-3 rounded-md border bg-muted/30 space-y-3 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-150">
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {palette && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Palette</div>
          <div className="flex flex-wrap items-center gap-3">
            {palette.primary && palette.primary.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Primary</span>
                <div className="flex gap-0.5">
                  {palette.primary.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
            {palette.accent && palette.accent.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Accent</span>
                <div className="flex gap-0.5">
                  {palette.accent.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
            {palette.background && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">BG</span>
                <div
                  className="w-4 h-4 rounded-sm border border-border"
                  style={{ backgroundColor: palette.background }}
                  title={palette.background}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {renderingCues && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rendering Cues</div>
          <div className="flex flex-wrap gap-1">
            {renderingCues.materials?.map((m, i) => (
              <Badge key={`m-${i}`} variant="secondary" className="text-[10px] h-5">{m}</Badge>
            ))}
            {renderingCues.effects?.map((e, i) => (
              <Badge key={`e-${i}`} variant="secondary" className="text-[10px] h-5">{e}</Badge>
            ))}
            {renderingCues.finish && (
              <Badge variant="outline" className="text-[10px] h-5">{renderingCues.finish}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedItemsDetail<T extends { id: string; name: string; description?: string | null }>({
  items,
  selectedIds,
}: {
  items: T[];
  selectedIds: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedItems = items.filter(item => selectedIds.includes(item.id) && item.description);
  if (selectedItems.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {selectedItems.length} selected — {expanded ? "hide" : "view"} descriptions
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-2 p-3 rounded-md border bg-muted/30 space-y-2 text-sm max-h-[200px] overflow-y-auto animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {selectedItems.map(item => (
            <div key={item.id} className="flex gap-2">
              <span className="font-medium text-foreground shrink-0">{item.name}</span>
              <span className="text-muted-foreground">{item.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConstructModeSelector({
  styles,
  subjects,
  categories,
  guidanceList,
  styleId,
  setStyleId,
  omitStyle,
  setOmitStyle,
  selectedSubjectIds,
  toggleSubject,
  selectedGuidanceIds,
  toggleGuidance,
  filterCategoryId,
  setFilterCategoryId,
  stylesFavoritesOnly,
  setStylesFavoritesOnly,
  subjectsFavoritesOnly,
  setSubjectsFavoritesOnly,
}: ConstructModeSelectorProps) {
  const selectedStyle = styles.find(s => s.id === styleId);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Style</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="omitStyle"
                checked={omitStyle}
                onCheckedChange={(checked: boolean) => {
                  setOmitStyle(checked);
                  if (checked) setStyleId("");
                }}
              />
              <label
                htmlFor="omitStyle"
                className="text-sm font-medium flex items-center gap-1 text-muted-foreground cursor-pointer"
              >
                <EyeOff className="h-3 w-3" />
                Omit Style
              </label>
            </div>
          </div>
          <Select
            value={styleId}
            onValueChange={setStyleId}
            disabled={omitStyle}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select style..." />
            </SelectTrigger>
            <SelectContent>
              {(stylesFavoritesOnly ? styles.filter(s => s.isFavorite) : styles).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    {s.isFavorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                    {s.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 mt-1">
            <Button
              type="button"
              variant={stylesFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setStylesFavoritesOnly(!stylesFavoritesOnly)}
              className={`h-6 text-xs ${stylesFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
            >
              <Star className={`h-3 w-3 mr-1 ${stylesFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites Only
            </Button>
          </div>
          {selectedStyle && <StyleDetailPanel style={selectedStyle} />}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Box className="h-4 w-4" /> Subjects</Label>
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Filter by category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#3b82f6' }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant={subjectsFavoritesOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setSubjectsFavoritesOnly(!subjectsFavoritesOnly)}
              className={`h-8 w-8 ${subjectsFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}`}
            >
              <Star className={`h-3 w-3 ${subjectsFavoritesOnly ? 'fill-current' : ''}`} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] max-h-[200px] overflow-y-auto">
            {(filterCategoryId === "all" ? subjects : subjects.filter(s => s.categoryId === filterCategoryId))
              .filter(s => !subjectsFavoritesOnly || s.isFavorite)
              .map((s) => {
                const subjectCategory = categories.find(c => c.id === s.categoryId);
                return (
                  <Badge
                    key={s.id}
                    variant={selectedSubjectIds.includes(s.id) ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${s.isTransparent && !selectedSubjectIds.includes(s.id) ? "border-pink-200 text-pink-600" : ""}`}
                    onClick={() => toggleSubject(s.id)}
                    style={subjectCategory && !selectedSubjectIds.includes(s.id) ? {
                      borderColor: subjectCategory.color + '60' || undefined,
                    } : undefined}
                  >
                    {subjectCategory && (
                      <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: subjectCategory.color || '#3b82f6' }} />
                    )}
                    {s.name}
                    {s.isTransparent && <span className="ml-1 text-[8px] opacity-70">★</span>}
                  </Badge>
                );
              })}
          </div>
          {selectedSubjectIds.length > 0 && (
            <SelectedItemsDetail items={subjects} selectedIds={selectedSubjectIds} />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><Compass className="h-4 w-4" /> Guidance</Label>
        <div className="flex flex-wrap gap-2">
          {guidanceList.map((g) => (
            <Badge
              key={g.id}
              variant={selectedGuidanceIds.includes(g.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleGuidance(g.id)}
            >
              {g.name}
            </Badge>
          ))}
        </div>
        {selectedGuidanceIds.length > 0 && (
          <SelectedItemsDetail items={guidanceList} selectedIds={selectedGuidanceIds} />
        )}
      </div>
    </div>
  );
}
