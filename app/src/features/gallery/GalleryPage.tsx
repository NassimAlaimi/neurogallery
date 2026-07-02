import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { applyFilters, filtersToParams, parseFilters, type FilterState } from "../../lib/urlState";
import { GalleryCard } from "./GalleryCard";
import { Filters } from "./Filters";

const SORT_METRIC = "clip";
const MAX_COLS = 4;
const MIN_CARD_WIDTH = 220;

export default function GalleryPage() {
  const { manifest, loading, error } = useManifest();
  const [params, setParams] = useSearchParams();
  const parent = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);

  useEffect(() => {
    const el = parent.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const compute = () => setCols(Math.max(1, Math.min(MAX_COLS, Math.floor(el.clientWidth / MIN_CARD_WIDTH))));
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const state = parseFilters(params);
  const method = state.method || manifest?.build.methods[0] || "";
  const items = useMemo(
    () => (manifest ? applyFilters(manifest.items, { ...state, method }, SORT_METRIC) : []),
    [manifest, params],
  );
  const rows = Math.ceil(items.length / cols);
  const rowVirtualizer = useVirtualizer({
    count: rows, getScrollElement: () => parent.current, estimateSize: () => 320, overscan: 4,
  });

  if (loading) return <main style={{ padding: "var(--space-32)" }}>Chargement…</main>;
  if (error || !manifest) return <main style={{ padding: "var(--space-32)" }}>Erreur : {error}</main>;

  const categories = [...new Set(manifest.items.map((i) => i.category).filter(Boolean) as string[])];
  const update = (next: FilterState) => setParams(filtersToParams(next));

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <h1 style={{ fontSize: "var(--text-title)" }}>Galerie · {manifest.build.subject}</h1>
      <Filters categories={categories} methods={manifest.build.methods} state={{ ...state, method }} onChange={update} />
      <div ref={parent} style={{ height: "70vh", overflow: "auto" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vr) => (
            <div key={vr.key} style={{
              position: "absolute", top: 0, transform: `translateY(${vr.start}px)`,
              display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "var(--space-16)", width: "100%",
            }}>
              {items.slice(vr.index * cols, vr.index * cols + cols).map((it) => (
                <GalleryCard key={it.id} item={it} method={method} base={ARTIFACT_BASE} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
