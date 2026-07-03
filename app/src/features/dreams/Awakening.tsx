import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Moon, Zap } from "lucide-react";
import { hasDecoding, type DreamExample, type DreamMetrics } from "../../lib/dreams";
import { AWAKENING_PHASES, atLeast, nextPhase, type AwakeningPhase } from "./awakening";
import { EegTrace } from "./EegTrace";
import { DreamPlate } from "./DreamPlate";
import { CategoryCompare } from "./CategoryCompare";

const STEP_MS = 1400;

/** "Awakening" sequence: sleeping → onset → awake → decoding → forming → truth. */
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
      {/* EEG monitor bar */}
      <div className="awk-eeg">
        <span className="awk-eeg-icon">{asleep ? <Moon size={15} /> : <Zap size={15} />}</span>
        <div className="eeg-wrap"><EegTrace active={!reduce && asleep} /></div>
        <span className="ui-label faint lbl">
          {asleep ? "asleep · sleep-onset" : "awake"}
        </span>
      </div>

      {/* Decoding: the real categories revealed one by one, before the dream forms.
          DreamPlate (below) hides its own chips via showCategories={false} to avoid
          duplicating the category text in the DOM. */}
      <div className={`awk-decoding${showCats ? " on" : ""}`}>
        {hasDecoding(dream) ? (
          <CategoryCompare reported={dream.reported ?? []} decoded={dream.decoded as string[]} />
        ) : (
          <>
            <span className="ui-label" style={{ color: "var(--cyan)" }}>Categories</span>
            <div className="awk-decoding-cats">
              {(dream.categories ?? []).map((c, i) => (
                <span key={`${c}-${i}`} className="cat-chip" style={{ transitionDelay: `${i * 120}ms` }}>{c}</span>
              ))}
            </div>
          </>
        )}
        <p className="faint ui-label" style={{ marginTop: "0.6rem" }}>
          {metrics.pairwise_accuracy_pct}% · {metrics.note}
        </p>
      </div>

      {/* Dream forming */}
      <div className={`awk-forming${showRender ? " on" : ""}`}>
        <DreamPlate dream={dream} showCategories={false} />
      </div>

      {/* Truth card */}
      <div className={`awk-truth${showTruth ? " on" : ""}`}>
        <p>
          <strong style={{ color: "var(--cyan)" }}>Real:</strong> the sleep fMRI + reported
          categories (Horikawa 2013). <strong style={{ color: "var(--magenta)" }}>Decoded</strong> by
          our reproduction; the image is an illustrative render, not a seen image.
        </p>
      </div>

      {/* Progress (visual cue) */}
      <div className="awk-steps" aria-hidden="true">
        {AWAKENING_PHASES.map((p) => (
          <span key={p} className={`awk-dot${atLeast(phase, p) ? " on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
