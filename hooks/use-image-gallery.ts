"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type GalleryImage } from "@/components/image-gallery-modal";

const IMAGES_LIMIT = 20;

export function useImageGallery(batchId: string | string[] | undefined, hasBatch: boolean) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [imageOffset, setImageOffset] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchImages = useCallback(async (currentOffset: number, isInitial: boolean = false) => {
    if (!batchId) return;

    if (isInitial) setLoadingImages(true);
    else setFetchingMore(true);

    try {
      const response = await fetch(`/api/images?batchId=${batchId}&limit=${IMAGES_LIMIT}&offset=${currentOffset}`);
      const data = await response.json();

      const newImages = data.images || [];
      if (isInitial) {
        setImages(newImages);
      } else {
        setImages(prev => [...prev, ...newImages]);
      }

      setHasMore(newImages.length === IMAGES_LIMIT);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoadingImages(false);
      setFetchingMore(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (hasBatch && batchId) {
      fetchImages(0, true);
    }
  }, [hasBatch, batchId, fetchImages]);

  const lastImageElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingImages || fetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        const nextOffset = images.length;
        setImageOffset(nextOffset);
        fetchImages(nextOffset);
      }
    });

    if (node) observer.current.observe(node);
  }, [loadingImages, fetchingMore, hasMore, images.length, fetchImages]);

  const updateImage = useCallback((imageId: string, updates: Partial<GalleryImage>) => {
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, ...updates } : img));
  }, []);

  const refetchImages = useCallback(() => {
    setImageOffset(0);
    setHasMore(true);
    fetchImages(0, true);
  }, [fetchImages]);

  return {
    images,
    loadingImages,
    fetchingMore,
    hasMore,
    imageOffset,
    lastImageElementRef,
    updateImage,
    setImages,
    refetchImages,
  };
}
