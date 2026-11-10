"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "powerbi-pinned-workspaces:v1";

export const usePinnedWorkspaces = () => {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggle = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  return { isPinned, toggle, pinnedIds };
};

