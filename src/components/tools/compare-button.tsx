"use client";

import { useCompareTools } from "@/lib/compare-tools";
import { GitCompareArrows } from "lucide-react";

export function AddToCompareButton({ slug, name }: { slug: string; name: string }) {
  const { has, toggle, isFull } = useCompareTools();
  const compared = has(slug);

  return (
    <button
      onClick={() => toggle(slug)}
      disabled={!compared && isFull}
      title={
        compared
          ? "Remove from compare"
          : isFull
            ? "Compare is full (max 4)"
            : "Add to compare"
      }
      aria-label={
        compared
          ? `Remove ${name} from compare`
          : `Add ${name} to compare`
      }
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 600,
        padding: "5px 10px", borderRadius: 999,
        border: compared ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
        background: compared ? "var(--accent)" : "transparent",
        color: compared ? "#fff" : "var(--muted)",
        cursor: !compared && isFull ? "not-allowed" : "pointer",
        opacity: !compared && isFull ? 0.4 : 1,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <GitCompareArrows size={13} />
      {compared ? "In Compare" : "Compare"}
    </button>
  );
}
