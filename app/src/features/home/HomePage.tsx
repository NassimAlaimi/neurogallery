import { Link } from "react-router-dom";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";

export default function HomePage() {
  const { manifest, loading, error } = useManifest();

  if (loading) return <main style={{ padding: "var(--space-32)" }}><h1>NeuroGallery</h1><p>Chargement…</p></main>;
  if (error || !manifest) {
    return (
      <main style={{ padding: "var(--space-32)" }}>
        <h1 style={{ fontSize: "var(--text-title)" }}>Impossible de charger la galerie.</h1>
      </main>
    );
  }

  const method = manifest.build.methods[0] ?? "";
  const hero = manifest.items.slice(0, 3);
  return (
    <main style={{ padding: "var(--space-section) var(--space-32)" }}>
      <p className="ui-label">NeuroGallery · sujet {manifest.build.subject}</p>
      <h1 style={{ fontSize: "var(--text-hero)", lineHeight: 1.02, margin: "var(--space-16) 0" }}>
        Ce que le cerveau regardait, reconstruit par une IA.
      </h1>
      <p style={{ maxWidth: "48ch", color: "var(--color-muted)" }}>
        À partir de l'activité IRMf du sujet, un modèle reconstruit l'image vue.
        Reconstructions pré-calculées sur le jeu de test {manifest.build.test_set}.
      </p>
      <div style={{ display: "flex", gap: "var(--space-16)", flexWrap: "wrap", margin: "var(--space-32) 0" }}>
        {hero.map((it) => <Plate key={it.id} item={it} method={method} base={ARTIFACT_BASE} />)}
      </div>
      <Link to="/gallery" className="cta">Explorer la galerie →</Link>
      <footer style={{ marginTop: "var(--space-section)", color: "var(--color-muted)", fontSize: "var(--text-small)" }}>
        <p>Recherche / démonstration uniquement — pas un dispositif clinique.</p>
        <p>Données : Natural Scenes Dataset (NSD, Allen et al., 2022). Stimuli : MS-COCO.</p>
      </footer>
    </main>
  );
}
