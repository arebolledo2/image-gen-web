"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Plus, Heart } from "lucide-react";
import type { GalleryImage } from "@/components/image-gallery-modal";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface ImagePickerProps {
  onAddImage: (image: GalleryImage) => void;
}

const LIMIT = 20;

export function ImagePicker({ onAddImage }: ImagePickerProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/subject-categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchImages = useCallback(
    async (offset: number, isInitial: boolean) => {
      if (isInitial) setLoading(true);
      else setFetchingMore(true);

      try {
        const url = new URL("/api/images", window.location.origin);
        url.searchParams.append("limit", LIMIT.toString());
        url.searchParams.append("offset", offset.toString());
        url.searchParams.append("transparentOnly", "true");
        if (favoritesOnly) url.searchParams.append("favoritesOnly", "true");
        if (debouncedSearch) url.searchParams.append("search", debouncedSearch);
        if (filterCategoryId !== "all")
          url.searchParams.append("categoryId", filterCategoryId);

        const response = await fetch(url.toString());
        const data = await response.json();
        const newImages = data.images || [];

        if (isInitial) {
          setImages(newImages);
        } else {
          setImages((prev) => [...prev, ...newImages]);
        }
        setHasMore(newImages.length === LIMIT);
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setLoading(false);
        setFetchingMore(false);
      }
    },
    [debouncedSearch, filterCategoryId, favoritesOnly]
  );

  // Reset and fetch on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show the loading state immediately when filters change
    fetchImages(0, true);
  }, [fetchImages]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingMore && !loading) {
          fetchImages(images.length, false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, fetchingMore, loading, images.length, fetchImages]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2 border-b">
        <h3 className="font-semibold text-sm">Image Library</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="composer-favorites"
            checked={favoritesOnly}
            onCheckedChange={setFavoritesOnly}
          />
          <Label
            htmlFor="composer-favorites"
            className="text-xs flex items-center gap-1 cursor-pointer"
          >
            <Heart className="h-3 w-3" />
            Favorites only
          </Label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No transparent images found
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => onAddImage(image)}
                className="group relative aspect-square rounded border bg-muted/50 overflow-hidden hover:border-primary transition-colors"
              >
                <Image
                  src={`/api/images/${image.id}/file?version=transparent&size=thumbnail`}
                  alt={image.fileName}
                  fill
                  className="object-contain"
                  style={{ imageRendering: "pixelated" }}
                  sizes="120px"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Plus className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}
        <div ref={observerRef} className="h-8">
          {fetchingMore && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
