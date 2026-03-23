"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

interface UsePullToRefreshResult {
  isPulling: boolean;
  pullProgress: number;
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isRefreshingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY !== 0) return;
    startYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null) return;
      if (window.scrollY !== 0) {
        startYRef.current = null;
        setIsPulling(false);
        setPullProgress(0);
        return;
      }
      if (isRefreshingRef.current) return;

      const currentY = e.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta <= 0) {
        setIsPulling(false);
        setPullProgress(0);
        return;
      }

      // Prevent native scroll bounce while pulling
      e.preventDefault();

      const progress = Math.min(delta / threshold, 1);
      setIsPulling(true);
      setPullProgress(progress);
    },
    [threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshingRef.current) {
      startYRef.current = null;
      return;
    }

    startYRef.current = null;

    if (pullProgress >= 1) {
      setIsPulling(false);
      setPullProgress(0);
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }
    } else {
      setIsPulling(false);
      setPullProgress(0);
    }
  }, [isPulling, pullProgress, onRefresh]);

  useEffect(() => {
    // Only enable on touch devices
    if (typeof window === "undefined") return;
    if (!("ontouchstart" in window)) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, pullProgress, isRefreshing };
}
