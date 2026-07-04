import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { applyFilters, filtersToParams, parseFilters, type FilterState } from "../../lib/urlState";
import { GalleryCard } from "./GalleryCard";
import { Filters } from "./Filters";

const MAX_COLS = 4;
const MIN_CARD_WIDTH = 240;
const GAP = 20;

export default function GalleryPage() {
  const { manifest, loading, error } = useManifest();
  const [params, setParams] = useSearchParams();
  const parent = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(MAX_COLS);
  const [rowH, setRowH] = useState(320);

  useEffect(() => {
    const el = parent.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const compute = () => {
      const w = el.clientWidth;
      const c = Math.max(1, Math.min(MAX_COLS, Math.floor(w / MIN_CARD_WIDTH)));
      setCols(c);
      setRowH((w - (c - 1) * GAP) / c + GAP);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-run once the manifest loads: the measured grid only exists after the
    // loading state clears, so the ref is null on the initial mount.
  }, [manifest]);

  const state = parseFilters(params);
  const method = state.method || manifest?.build.methods[0] || "";
  // Sort/display metric = whichever is actually present (clip if available, else the first one).
  const sample = manifest?.items.find((i) => Object.keys(i.metrics[method] ?? {}).length);
  const metricKeys = sample ? Object.keys(sample.metrics[method]) : [];
  const metricKey = metricKeys.includes("clip") ? "clip" : metricKeys[0] ?? "";
  const items = useMemo(
    () => (manifest ? applyFilters(manifest.items, { ...state, method }, metricKey) : []),
    [manifest, params, metricKey],
  );
  const rows = Math.ceil(items.length / cols);
  const rowVirtualizer = useVirtualizer({
    count: rows, getScrollElement: () => parent.current, estimateSize: () => rowH, overscan: 3,
  });
  useEffect(() => { rowVirtualizer.measure(); }, [rowH, cols]);

  if (loading)
    return <div className="wrap section"><h1 style={{ fontSize: "var(--text-title)" }}>Gallery</h1><p className="dim">Loading…</p></div>;
  if (error || !manifest)
    return <div className="wrap section"><h1 style={{ fontSize: "var(--text-title)" }}>Couldn't load the gallery.</h1></div>;

  const categories = [...new Set(manifest.items.map((i) => i.category).filter(Boolean) as string[])];
  const update = (next: FilterState) => setParams(filtersToParams(next));

  return (
    <div className="wrap" style={{ paddingTop: "2.5rem", paddingBottom: "2rem" }}>
      <p className="eyebrow"><span className="pulse" /> {items.length} reconstructions · {method}</p>
      <h1 style={{ fontSize: "var(--text-display)", margin: "1rem 0 1.75rem" }}>
        Gallery <span className="dim" style={{ fontWeight: 400 }}>· subject {manifest.build.subject}</span>
      </h1>

      <Filters categories={categories} methods={manifest.build.methods} state={{ ...state, method }} onChange={update} />

      <div ref={parent} style={{ height: "calc(100vh - 160px)", overflow: "auto", marginInline: "-4px", paddingInline: "4px" }}>
        <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vr) => (
            <div key={vr.key} style={{
              position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${vr.start}px)`,
              display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${GAP}px`, paddingBottom: `${GAP}px`,
            }}>
              {items.slice(vr.index * cols, vr.index * cols + cols).map((it) => (
                <GalleryCard key={it.id} item={it} method={method} metricKey={metricKey} base={ARTIFACT_BASE} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
