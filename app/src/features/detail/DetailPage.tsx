import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";
import { Reveal } from "../../components/Reveal";
import { formatMetric } from "../../lib/metrics";

export default function DetailPage() {
  const { id } = useParams();
  const { manifest, loading, error } = useManifest();

  if (loading) return <div className="wrap section"><h1>Loading…</h1></div>;
  if (error || !manifest) {
    return (
      <div className="wrap section">
        <h1 style={{ fontSize: "var(--text-title)" }}>Error</h1>
        <p className="dim">Couldn't load the gallery.</p>
        <Link to="/gallery" className="btn btn-ghost" style={{ marginTop: "1rem" }}><ArrowLeft size={16} /> Gallery</Link>
      </div>
    );
  }
  const item = manifest.items.find((i) => i.id === id);
  if (!item)
    return (
      <div className="wrap section">
        <h1 style={{ fontSize: "var(--text-title)" }}>Item not found</h1>
        <Link to="/gallery" className="btn btn-ghost" style={{ marginTop: "1rem" }}><ArrowLeft size={16} /> Gallery</Link>
      </div>
    );

  const methods = manifest.build.methods.filter((m) => m in item.recon);

  return (
    <div className="wrap" style={{ paddingTop: "2rem", paddingBottom: "var(--sp-section)" }}>
      <Link to="/gallery" className="nav-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={15} /> Gallery
      </Link>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.9rem", flexWrap: "wrap", margin: "1rem 0 0.4rem" }}>
        <h1 style={{ fontSize: "var(--text-display)" }}>Item {item.id}</h1>
        {item.category && <span className="eyebrow">{item.category}</span>}
      </div>
      <p className="faint" style={{ fontSize: "var(--text-sm)" }}>coco #{item.coco_id} · {methods.length} method(s)</p>

      {methods.map((m, mi) => (
        <Reveal key={m} delay={mi * 0.05}>
          <section className="panel-card" style={{ padding: "clamp(1rem,3vw,2rem)", marginTop: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "var(--text-lg)", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="brand-dot" style={{ width: 9, height: 9 }} /> {m}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {Object.entries(item.metrics[m] ?? {}).map(([k, v]) => (
                  <span key={k} data-testid="metric" className="chip" style={{ cursor: "default", fontSize: "0.72rem" }}>
                    <span className="ui-label" style={{ letterSpacing: "0.1em" }}>{k}</span>
                    <span className="tabular grad-text" style={{ fontWeight: 700 }}>{formatMetric(v)}</span>
                  </span>
                ))}
              </div>
            </div>
            <Plate item={item} method={m} base={ARTIFACT_BASE} />
          </section>
        </Reveal>
      ))}

      <hr className="divider-neural" style={{ margin: "2.5rem 0 1.25rem" }} />
      <footer className="faint" style={{ fontSize: "var(--text-sm)" }}>
        {item.gt.path !== null
          ? <p>Source: {item.gt.license_name}{item.gt.attribution ? ` — ${item.gt.attribution}` : ""}
              {item.gt.source_url ? <> · <a href={item.gt.source_url} style={{ color: "var(--ink-dim)" }}>original</a></> : null}</p>
          : <p>Non-permissive license ({item.gt.license_name}): source image not shown.</p>}
      </footer>
    </div>
  );
}
