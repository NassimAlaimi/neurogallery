import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Moon, Check, X, ArrowRight, BookOpen } from "lucide-react";
import { useDreams } from "../../hooks/useDreams";
import { Reveal } from "../../components/Reveal";
import { Awakening } from "./Awakening";
import { DreamPlate } from "./DreamPlate";
import { dreamAsset, displayCategories, type DreamExample } from "../../lib/dreams";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
}

const abstractSub = { fontWeight: 400, fontSize: "var(--text-xs)" } as const;

// Staggered scroll reveal for the pipeline: nodes and connectors appear in
// sequence as the section scrolls into view: a little "how it flows" scenario.
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const pipeContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.32, delayChildren: 0.1 } },
};
const pipeItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};

/** Dream thumbnail for the diagram: the generated image, or a gradient fallback if missing. */
function RenderFrame({ dream }: { dream: DreamExample }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="frame abstract">
        <span>dream<br /><span className="faint" style={abstractSub}>illustrative render</span></span>
      </div>
    );
  }
  return (
    <div className="frame">
      <img
        src={dreamAsset(dream.render)}
        alt="Reconstructed dream, illustrative render"
        width={220} height={220} loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function DreamsPage() {
  const { dreams, loading, error } = useDreams();
  const reduce = useReducedMotion();

  if (loading) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Dreams</h1><p className="dim">Loading…</p></Shell>;
  if (error || !dreams) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Couldn't load the dreams.</h1></Shell>;

  const hero = dreams.examples.find((e) => e.featured) ?? dreams.examples[0];
  const others = dreams.examples.filter((e) => e.id !== hero.id);
  const s = dreams.study;

  return (
    <div className="dream-night">
      {/* HERO */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,6rem)", paddingBottom: "clamp(1rem,3vw,2rem)" }}>
        <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Moon size={14} /> At the edge of sleep
        </motion.p>
        <motion.h1 className="hero-title" style={{ fontSize: "var(--text-display)", margin: "1.1rem 0 1.2rem" }}
          initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>
          And while<br /><span className="grad-text">we sleep?</span>
        </motion.h1>
        <motion.p className="explain-lead" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}>
          This gallery reconstructs what a person <strong>looks at</strong>. Here we take the idea
          one step further: can we decode what they <strong>dream</strong>? The same visual cortex
          fires when dreaming as when seeing, and in 2013, Kamitani's team did exactly that. Here's
          how, and how far it's real.
        </motion.p>
      </section>

      {/* HOW IT WORKS: pipeline explained here, animated on scroll */}
      <section className="wrap section" style={{ paddingTop: "1.5rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>How it <span className="grad-text">works</span></h2></Reveal>
        <Reveal delay={0.05}>
          <p className="dim" style={{ textAlign: "center", maxWidth: "56ch", margin: "0 auto 2.75rem" }}>
            Exactly NeuroGallery's chain (<em>brain activity → categories → image</em>), but the
            decoder is trained on <strong style={{ color: "var(--ink)" }}>waking</strong> perception,
            then applied to <strong style={{ color: "var(--ink)" }}>sleep</strong>.
          </p>
        </Reveal>
        <motion.div
          className="pipeline"
          variants={pipeContainer}
          initial={reduce ? false : "hidden"}
          whileInView={reduce ? undefined : "show"}
          viewport={{ once: true, margin: "-90px" }}
        >
          <motion.div className="pipe-node" variants={pipeItem}>
            <div className="frame abstract"><span>Brain<br />activity<br /><span className="faint" style={abstractSub}>during sleep</span></span></div>
            <div className="cap ui-label">Brain · sleep</div>
          </motion.div>
          <motion.div className="pipe-connector" variants={pipeItem}><span className="op" style={{ color: "var(--cyan)" }}>Decoder · real</span><span className="pipe-signal" /></motion.div>
          <motion.div className="pipe-node" variants={pipeItem}>
            <div className="frame abstract"><span>{displayCategories(hero).join(" · ")}<br /><span className="faint" style={abstractSub}>decoded categories</span></span></div>
            <div className="cap ui-label">Categories · real</div>
          </motion.div>
          <motion.div className="pipe-connector" variants={pipeItem}><span className="op" style={{ color: "var(--magenta)" }}>Diffusion · our render</span><span className="pipe-signal" style={{ animationDelay: "1.3s" }} /></motion.div>
          <motion.div className="pipe-node" variants={pipeItem}>
            <RenderFrame dream={hero} />
            <div className="cap ui-label">Dream · illustrative render</div>
          </motion.div>
        </motion.div>
        <Reveal delay={0.15}>
          <p className="dim" style={{ textAlign: "center", maxWidth: "62ch", margin: "1.75rem auto 0", fontSize: "var(--text-sm)" }}>
            <strong style={{ color: "var(--cyan)" }}>In blue</strong>: measured in the brain and decoded (Kamitani&nbsp;2013).{" "}
            <strong style={{ color: "var(--magenta)" }}>In magenta</strong>: our illustrative render: a dream has no reference image.{" "}
            <Link to="/explain" className="inline-link">The method in detail</Link>.
          </p>
        </Reveal>
      </section>

      {/* THE REAL PROTOCOL */}
      <section className="wrap section" style={{ paddingTop: "2rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>The real protocol</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
          {[
            { n: "01", t: "Sleep in an fMRI", d: `${s.subjects} subjects asleep in the scanner, simultaneous EEG.` },
            { n: "02", t: "Detect sleep onset", d: "EEG spots the sleep-onset signature (NREM)." },
            { n: "03", t: "Wake & ask", d: `"What did you see?" ${s.awakenings_per_subject} awakenings per subject.` },
            { n: "04", t: "Decode 9 s of activity", d: `The ${s.window_volumes} volumes (${s.window_seconds}s) before waking are decoded.` },
          ].map((c, i) => (
            <Reveal key={c.n} delay={i * 0.07}>
              <div className="panel-card" style={{ padding: "1.5rem", height: "100%" }}>
                <span className="grad-text" style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{c.n}</span>
                <h3 style={{ fontSize: "var(--text-base)", marginTop: "0.5rem" }}>{c.t}</h3>
                <p className="dim" style={{ marginTop: "0.4rem", fontSize: "var(--text-sm)" }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CENTREPIECE */}
      <section className="wrap section" style={{ paddingTop: "1rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>One <span className="grad-text">awakening</span></h2></Reveal>
        <Reveal delay={0.05}><p className="dim" style={{ textAlign: "center", maxWidth: "48ch", margin: "0 auto 2.5rem" }}>From sleep to image: what the brain encoded, decoded then rendered.</p></Reveal>
        <Reveal delay={0.1}><Awakening dream={hero} metrics={dreams.study_metrics} /></Reveal>
      </section>

      {/* MORE DREAMS */}
      {others.length > 0 && (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>More dreams</h2></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem" }}>
            {others.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.08}><DreamPlate dream={d} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* WHAT IT DOES / DOESN'T */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>
          <Reveal>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--good)" }}>What it does</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Recovers categories that were actually dreamed, better than chance.",
                  "Relies on the same visual cortex as waking perception.",
                  "Built on published, open data (Kamitani Lab)."].map((t) => (
                  <li key={t}><Check className="ic" size={17} color="var(--good)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--bad)" }}>What it doesn't do</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["The image shown is an illustrative render, not a seen image of the dream.",
                  "No pixel truth: a dream has no reference image.",
                  "Robust decoding is at the category level, not sharp photos."].map((t) => (
                  <li key={t}><X className="ic" size={17} color="var(--bad)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2013 → TODAY + SOURCES */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-band">
            <h2 style={{ fontSize: "var(--text-title)" }}>2013 → today</h2>
            <p className="dim" style={{ maxWidth: "52ch", margin: "0.75rem auto 1.5rem" }}>
              From categories (2013) to reconstructed "dream video" (2025). The field moves fast,
              and stays honest about how blurry the result is.
            </p>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/explain" className="btn btn-primary"><BookOpen size={17} /> The method</Link>
              <Link to="/gallery" className="btn btn-ghost">The gallery <ArrowRight size={17} /></Link>
            </div>
            <div className="dream-sources">
              {dreams.sources.map((src) => (
                <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="inline-link">{src.label}</a>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
