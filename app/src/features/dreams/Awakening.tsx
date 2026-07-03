import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Moon, Zap } from "lucide-react";
import type { DreamExample, DreamMetrics } from "../../lib/dreams";
import { AWAKENING_PHASES, atLeast, nextPhase, type AwakeningPhase } from "./awakening";
import { EegTrace } from "./EegTrace";
import { DreamPlate } from "./DreamPlate";

const STEP_MS = 1400;

/** Séquence « réveil » : sleeping → onset → awake → decoding → forming → truth. */
export function Awakening({ dream, metrics }: { dream: DreamExample; metrics: DreamMetrics }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<AwakeningPhase>(reduce ? "truth" : "sleeping");

  useEffect(() => {
    if (reduce) { setPhase("truth"); return; }
    if (phase === "truth") return;
    const t = setTimeout(() => setPhase((p) => nextPhase(p)), STEP_MS);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const showCats = atLeast(phase, "decoding");
  const showRender = atLeast(phase, "forming");
  const showTruth = atLeast(phase, "truth");
  const asleep = !atLeast(phase, "awake");

  return (
    <div className={`awakening awakening-${phase}`}>
      {/* Bandeau EEG / sommeil */}
      <div className="awk-eeg">
        <span className="awk-eeg-icon">{asleep ? <Moon size={16} /> : <Zap size={16} />}</span>
        <EegTrace active={!reduce && asleep} />
        <span className="ui-label faint">
          {asleep ? "sommeil · sleep-onset" : "réveil"}
        </span>
      </div>

      {/* Décodage : catégories réelles (chips affichés une seule fois, via DreamPlate ci-dessous,
          pour éviter la duplication de texte — cette section n'annonce que le label et la mesure). */}
      <div className={`awk-decoding${showCats ? " on" : ""}`}>
        <span className="ui-label" style={{ color: "var(--cyan)" }}>Catégories décodées</span>
        <p className="faint ui-label" style={{ marginTop: "0.6rem" }}>
          {metrics.pairwise_accuracy_pct}% — {metrics.note}
        </p>
      </div>

      {/* Formation du rêve */}
      <div className={`awk-forming${showRender ? " on" : ""}`}>
        <DreamPlate dream={dream} />
      </div>

      {/* Carte de vérité */}
      <div className={`awk-truth${showTruth ? " on" : ""}`}>
        <p>
          <strong style={{ color: "var(--cyan)" }}>Réel :</strong> activité + catégories
          {" "}(Horikawa 2013). <strong style={{ color: "var(--magenta)" }}>Rendu :</strong> l'image
          est notre reconstruction illustrative, pas une image vue.
        </p>
      </div>

      {/* Progression (repère visuel) */}
      <div className="awk-steps" aria-hidden="true">
        {AWAKENING_PHASES.map((p) => (
          <span key={p} className={`awk-dot${atLeast(phase, p) ? " on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
