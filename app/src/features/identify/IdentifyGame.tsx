import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE, assetUrl } from "../../lib/artifact";
import { buildRound, eligibleItems, isCorrect } from "../../lib/identify";

const OPTIONS = 4;
const TITLE = "Guess the seen image";

export default function IdentifyGame() {
  const { manifest, error, loading } = useManifest();
  const reduce = useReducedMotion();
  const [seed, setSeed] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  const method = manifest?.build.methods[0] ?? "";
  const pool = manifest?.items ?? [];
  const enough = eligibleItems(pool).length >= OPTIONS;

  const round = useMemo(() => (enough ? buildRound(pool, OPTIONS, Math.random) : null), [manifest, seed, enough]);

  if (loading) return <div className="wrap section"><h1>{TITLE}</h1><p className="dim">Loading…</p></div>;
  if (error || !manifest) return <div className="wrap section"><h1>{TITLE}</h1><p className="dim">Couldn't load the gallery.</p></div>;
  if (!enough || !round) return <div className="wrap section"><h1>{TITLE}</h1><p className="dim">Not enough source-visible images to play.</p></div>;

  const target = pool.find((i) => i.id === round.targetId)!;
  const options = round.optionIds.map((id) => pool.find((i) => i.id === id)!);
  const correct = chosen !== null && isCorrect(round, chosen);

  const pick = (id: string) => {
    if (chosen !== null) return;
    setChosen(id);
    setScore((s) => ({ ok: s.ok + (id === round.targetId ? 1 : 0), total: s.total + 1 }));
  };
  const next = () => { setChosen(null); setSeed((s) => s + 1); };

  return (
    <div className="wrap section identify-stage">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 560, gap: "1rem" }}>
        <h1 style={{ fontSize: "var(--text-display)", textAlign: "left" }}>{TITLE}</h1>
        <span className="chip tabular" style={{ cursor: "default" }}>{score.ok} / {score.total}</span>
      </div>
      <p className="ui-label">Based on this reconstruction, which image was the subject looking at?</p>

      <motion.div
        className="identify-recon"
        key={`recon-${seed}`}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <img data-testid="identify-recon" src={assetUrl(ARTIFACT_BASE, target.recon[method])}
          alt="Reconstruction to identify" width={340} height={340} />
      </motion.div>

      <div className="identify-options">
        {options.map((opt) => {
          const isTarget = opt.id === round.targetId;
          const dataState = chosen === null ? undefined
            : isTarget ? "correct"
            : chosen === opt.id ? "wrong"
            : "dim";
          return (
            <motion.button
              key={opt.id} data-testid="identify-option" data-state={dataState}
              className="option" disabled={chosen !== null} onClick={() => pick(opt.id)}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              aria-label={`Option ${opt.id}`}
            >
              <img src={assetUrl(ARTIFACT_BASE, opt.gt.path as string)} alt={`Option ${opt.id}`} width={256} height={256} loading="lazy" />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {chosen && (
          <motion.div
            data-testid="identify-feedback" role="status" key="fb"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            <span className={`feedback ${correct ? "ok" : "no"}`}>
              {correct ? "Correct!" : "Wrong — the correct answer is highlighted."}
            </span>
            <button className="btn btn-primary" onClick={next}><RefreshCw size={16} /> Next round</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
