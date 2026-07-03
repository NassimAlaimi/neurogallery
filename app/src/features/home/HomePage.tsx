import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Cpu, Sparkles, ArrowRight, Gamepad2 } from "lucide-react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE } from "../../lib/artifact";
import { Plate } from "../../components/ui/Plate";
import { Reveal } from "../../components/Reveal";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
}

export default function HomePage() {
  const { manifest, loading, error } = useManifest();
  const reduce = useReducedMotion();

  if (loading) return <Shell><h1 className="hero-title">NeuroGallery</h1><p className="dim">Chargement…</p></Shell>;
  if (error || !manifest) {
    return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Impossible de charger la galerie.</h1></Shell>;
  }

  const method = manifest.build.methods[0] ?? "";
  const heroItem = manifest.items[0];
  const featured = manifest.items.slice(1, 4);
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <>
      {/* ——— HERO ——— */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,7rem)", paddingBottom: "clamp(2rem,5vw,5rem)" }}>
        <motion.p className="eyebrow" {...rise(0)}>
          <span className="pulse" /> Décodage cérébral · sujet {manifest.build.subject}
        </motion.p>
        <motion.h1 className="hero-title" style={{ margin: "1.2rem 0 0" }} {...rise(0.08)}>
          Ce que ton cerveau<br />regardait,{" "}
          <span className="grad-text">reconstruit par une IA.</span>
        </motion.h1>
        <motion.p className="dim" style={{ maxWidth: "52ch", fontSize: "var(--text-lg)", marginTop: "1.5rem" }} {...rise(0.16)}>
          À partir de la seule activité IRMf du sujet — aucune image en entrée — un modèle
          reconstruit la scène qu'il observait. {manifest.items.length} reconstructions
          sur le jeu de test {manifest.build.test_set}.
        </motion.p>
        <motion.div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", marginTop: "2rem" }} {...rise(0.24)}>
          <Link to="/gallery" className="btn btn-primary">Explorer la galerie <ArrowRight size={17} /></Link>
          <Link to="/identify" className="btn btn-ghost"><Gamepad2 size={17} /> Jouer à deviner</Link>
        </motion.div>

        {heroItem && (
          <motion.div style={{ marginTop: "clamp(2.5rem,6vw,5rem)" }} {...rise(0.34)}>
            <div className="panel-card" style={{ padding: "clamp(1rem,3vw,2rem)" }}>
              <Plate item={heroItem} method={method} base={ARTIFACT_BASE} />
            </div>
          </motion.div>
        )}
      </section>

      {/* ——— STATS ——— */}
      <Reveal>
        <div className="wrap" style={{ paddingBlock: "1rem" }}>
          <div className="stat-row">
            {[
              { n: manifest.items.length, l: "reconstructions" },
              { n: manifest.build.methods.length, l: "modèles comparés" },
              { n: "512px", l: "résolution (MindEye2)" },
              { n: "100%", l: "local · sur une RTX 5070" },
            ].map((s) => (
              <div key={s.l}>
                <div className="stat-num grad-text tabular">{s.n}</div>
                <div className="stat-lbl">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ——— COMMENT ÇA MARCHE ——— */}
      <section className="wrap section">
        <Reveal><h2 style={{ fontSize: "var(--text-display)" }}>De la <span className="grad-text">neige cérébrale</span><br />à une image.</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem", marginTop: "2.5rem" }}>
          {[
            { icon: Brain, t: "1 · L'activité cérébrale", d: "~15 700 mesures d'IRMf pendant que le sujet observe une image. Pour nous, ça ressemble à du bruit." },
            { icon: Cpu, t: "2 · Le décodage", d: "Un modèle traduit cette signature en représentation, puis un modèle de diffusion génère l'image." },
            { icon: Sparkles, t: "3 · L'image reconstruite", d: "Une scène reconnaissable — sans que le modèle ait jamais vu la photo d'origine." },
          ].map((step, i) => (
            <Reveal key={step.t} delay={i * 0.08}>
              <div className="panel-card" style={{ padding: "1.5rem", height: "100%" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)" }}>
                  <step.icon size={22} />
                </div>
                <h3 style={{ fontSize: "var(--text-lg)", marginTop: "1rem" }}>{step.t}</h3>
                <p className="dim" style={{ marginTop: "0.5rem", fontSize: "var(--text-sm)" }}>{step.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——— SÉLECTION ——— */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "var(--text-display)" }}>Sélection</h2>
            <Link to="/gallery" className="nav-link" style={{ fontWeight: 600 }}>Tout voir <ArrowRight size={14} style={{ display: "inline", verticalAlign: "-2px" }} /></Link>
          </div>
        </Reveal>
        <div style={{ display: "grid", gap: "1.5rem", marginTop: "2rem" }}>
          {featured.map((it, i) => (
            <Reveal key={it.id} delay={i * 0.06}>
              <div className="panel-card" style={{ padding: "clamp(0.85rem,2.5vw,1.5rem)" }}>
                <Plate item={it} method={method} base={ARTIFACT_BASE} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ——— FOOTER ——— */}
      <footer className="foot">
        <div className="wrap" style={{ paddingBlock: "2.5rem", display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between" }}>
          <div>
            <div className="brand" style={{ fontSize: "1rem" }}><span className="brand-dot" /> NeuroGallery</div>
            <p style={{ marginTop: "0.6rem", maxWidth: "40ch" }}>Recherche / démonstration — pas un dispositif clinique.</p>
          </div>
          <p style={{ maxWidth: "38ch" }}>
            Données : Natural Scenes Dataset (NSD, Allen et al., 2022). Stimuli : MS-COCO.
            Reconstructions : MindEye2 / Brain-Diffuser.
          </p>
        </div>
      </footer>
    </>
  );
}
