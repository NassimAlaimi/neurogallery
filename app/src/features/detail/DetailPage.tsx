import { Link, useParams } from "react-router-dom";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";
import { formatMetric } from "../../lib/metrics";

export default function DetailPage() {
  const { id } = useParams();
  const { manifest, loading, error } = useManifest();
  if (loading) return <main style={{ padding: "var(--space-32)" }}><h1>Chargement…</h1></main>;
  if (error || !manifest) {
    return (
      <main style={{ padding: "var(--space-32)" }}>
        <h1>Erreur</h1>
        <p>Impossible de charger la galerie.</p>
        <Link to="/gallery">← Galerie</Link>
      </main>
    );
  }
  const item = manifest.items.find((i) => i.id === id);
  if (!item) return <main style={{ padding: "var(--space-32)" }}><h1>Item introuvable</h1><Link to="/gallery">← Galerie</Link></main>;

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <Link to="/gallery" className="ui-label">← Galerie</Link>
      <h1>Item {item.id}{item.category ? ` · ${item.category}` : ""}</h1>
      {manifest!.build.methods.filter((m) => m in item.recon).map((m) => (
        <section key={m} style={{ margin: "var(--space-24) 0" }}>
          <h2 className="ui-label">{m}</h2>
          <Plate item={item} method={m} base={ARTIFACT_BASE} />
          <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap", marginTop: "var(--space-8)" }}>
            {Object.entries(item.metrics[m] ?? {}).map(([k, v]) => (
              <span key={k} data-testid="metric" className="ui-label">{k} : {formatMetric(v)}</span>
            ))}
          </div>
        </section>
      ))}
      <footer style={{ color: "var(--color-muted)", fontSize: "var(--text-small)" }}>
        {item.gt.displayable
          ? <p>Source : {item.gt.license_name}{item.gt.attribution ? ` — ${item.gt.attribution}` : ""}
              {item.gt.source_url ? <> · <a href={item.gt.source_url}>origine</a></> : null}</p>
          : <p>Licence non permissive ({item.gt.license_name}) : image source non affichable (voir ci-dessus).</p>}
      </footer>
    </main>
  );
}
