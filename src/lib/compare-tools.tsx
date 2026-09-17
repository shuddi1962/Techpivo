"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "tp_compare_tools";
const MAX_COMPARE = 4;

interface CompareState {
  slugs: string[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  toggle: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  count: number;
  isFull: boolean;
}

const CompareContext = createContext<CompareState | null>(null);

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: unknown) => typeof s === "string").slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function writeStorage(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // storage full or blocked — silent
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setSlugs(readStorage());
  }, []);

  const add = useCallback((slug: string) => {
    setSlugs((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug].slice(0, MAX_COMPARE);
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.filter((s) => s !== slug);
      writeStorage(next);
      return next;
    });
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug].slice(0, MAX_COMPARE);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSlugs([]);
    writeStorage([]);
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const value = useMemo<CompareState>(() => ({
    slugs,
    add,
    remove,
    toggle,
    clear,
    has,
    count: slugs.length,
    isFull: slugs.length >= MAX_COMPARE,
  }), [slugs, add, remove, toggle, clear, has]);

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompareTools(): CompareState {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    // Outside provider — return a no-op fallback so components don't crash
    return {
      slugs: [],
      add: () => {},
      remove: () => {},
      toggle: () => {},
      clear: () => {},
      has: () => false,
      count: 0,
      isFull: false,
    };
  }
  return ctx;
}

/** Floating bar shown on tool pages when 2+ tools are selected */
export function CompareFloatingBar() {
  const { slugs, clear } = useCompareTools();
  if (slugs.length < 2) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-3 shadow-lg"
      style={{ transform: "translateX(-50%)" }}
    >
      <span className="text-sm font-semibold text-[color:var(--text)]">
        {slugs.length} tool{slugs.length !== 1 ? "s" : ""} selected
      </span>
      <a
        href={`/tools/compare?tools=${slugs.join(",")}`}
        className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-bold text-white"
        style={{ background: "hsl(var(--accent))" }}
      >
        Compare Now
      </a>
      <button
        onClick={clear}
        className="text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)]"
      >
        Clear
      </button>
    </div>
  );
}
