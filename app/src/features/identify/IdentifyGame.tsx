import { useMemo, useState } from "react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { assetUrl } from "../../lib/artifact";
import { buildRound, eligibleItems, isCorrect } from "../../lib/identify";

const OPTIONS = 4;

export default function IdentifyGame() {
  const { manifest, loading } = useManifest();
  const [seed, setSeed] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  const method = manifest?.build.methods[0] ?? "";
  const pool = manifest?.items ?? [];
  const enough = eligibleItems(pool).length >= OPTIONS;

  const round = useMemo(() => {
    if (!enough) return null;
    return buildRound(pool, OPTIONS, Math.random);
    // seed force un recalcul via la dépendance
  }, [manifest, seed, enough]);

  if (loading) return <main style={{ padding: "var(--space-32)" }}>Chargement…</main>;
  if (!enough || !round) {
    return <main style={{ padding: "var(--space-32)" }}><p>Pas assez d'images à source visible pour jouer.</p></main>;
  }

  const target = pool.find((i) => i.id === round.targetId)!;
  const options = round.optionIds.map((id) => pool.find((i) => i.id === id)!);

  return (
    <main style={{ padding: "var(--space-32)" }}>
      <h1>Devine l'image vue</h1>
      <p className="ui-label">D'après cette reconstruction, quelle image le sujet regardait-il ?</p>
      <img data-testid="identify-recon" src={assetUrl(ARTIFACT_BASE, target.recon[method])}
        alt="Reconstruction à identifier" width={256} height={256} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-16)", maxWidth: 560 }}>
        {options.map((opt) => (
          <button key={opt.id} data-testid="identify-option" disabled={chosen !== null}
            onClick={() => setChosen(opt.id)}
            style={{ padding: 0, border: chosen === opt.id ? "3px solid var(--color-accent)" : "1px solid var(--color-line)", background: "none", cursor: "pointer" }}>
            <img src={assetUrl(ARTIFACT_BASE, opt.gt.path!)} alt={`Option ${opt.id}`} width={256} height={256} />
          </button>
        ))}
      </div>
      {chosen && (
        <div data-testid="identify-feedback" role="status" style={{ marginTop: "var(--space-16)" }}>
          {isCorrect(round, chosen) ? "✅ Correct !" : "❌ Raté — la bonne réponse est mise en évidence."}
          <button style={{ marginLeft: "var(--space-16)" }}
            onClick={() => { setChosen(null); setSeed((s) => s + 1); }}>Manche suivante</button>
        </div>
      )}
    </main>
  );
}
