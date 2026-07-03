import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Brain, Cpu, Sparkles, ScanLine, ArrowRight, Check, X, Database, Gamepad2 } from "lucide-react";
import { useManifest } from "../../hooks/useManifest";
import { ARTIFACT_BASE, assetUrl } from "../../lib/artifact";
import { Reveal } from "../../components/Reveal";
import type { Item } from "../../lib/manifest";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
}

const px = (it: Item, m: string) => it.metrics[m]?.pixcorr ?? -Infinity;

export default function ExplainPage() {
  const { manifest, loading, error } = useManifest();
  const reduce = useReducedMotion();

  if (loading) return <Shell><h1 className="hero-title" style={{ fontSize: "var(--text-display)" }}>Method</h1><p className="dim">Loading…</p></Shell>;
  if (error || !manifest) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Couldn't load.</h1></Shell>;

  const primary = manifest.build.methods.includes("mindeye2") ? "mindeye2" : manifest.build.methods[0];
  const other = manifest.build.methods.find((m) => m !== primary);
  // running example: the best reconstruction (with input + ground truth)
  const withGt = manifest.items.filter((i) => i.gt.path && i.input && primary in i.recon);
  const ex = [...withGt].sort((a, b) => px(b, primary) - px(a, primary))[0] ?? manifest.items[0];
  const A = ARTIFACT_BASE;

  return (
    <>
      {/* HERO */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,6rem)", paddingBottom: "clamp(1rem,3vw,2rem)" }}>
        <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="pulse" /> The method, in plain terms
        </motion.p>
        <motion.h1 className="hero-title" style={{ fontSize: "var(--text-display)", margin: "1.1rem 0 1.2rem" }}
          initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>
          Reading a brain,<br /><span className="grad-text">explained.</span>
        </motion.h1>
        <motion.p className="explain-lead" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}>
          No magic, no telepathy. Just measurements, a bit of statistics,
          and a generative model. Here's how an image is born from simple brain activity.
        </motion.p>
      </section>

      {/* THE IDEA */}
      <section className="wrap section" style={{ paddingTop: "2.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(1.5rem,4vw,3rem)", alignItems: "center" }}>
          <Reveal>
            <div>
              <span className="ui-label" style={{ color: "var(--cyan)" }}>The idea</span>
              <h2 style={{ fontSize: "var(--text-title)", margin: "0.6rem 0 1rem" }}>To look is to activate.</h2>
              <p className="dim">
                When the subject looks at an image, their <strong style={{ color: "var(--ink)" }}>visual cortex</strong> (at the back of the skull)
                activates in a pattern unique to that image. An fMRI scan measures this activity: about
                <strong style={{ color: "var(--ink)" }}> 15,700 values</strong>, one per small cube of brain tissue (a "voxel").
                This pattern, invisible and abstract to us, holds a fingerprint of what's being seen.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <figure className="panel-card" style={{ padding: "1rem", margin: 0 }}>
              <div style={{ aspectRatio: 1, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line)" }}>
                <img src={assetUrl(A, ex.input as string)} alt="Brain activity (fMRI slices)" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <figcaption className="ui-label" style={{ marginTop: "0.7rem", textAlign: "center" }}>Real brain activity · visual cortex</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* PIPELINE (showpiece) */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>From <span className="grad-text">signal</span> to image</h2></Reveal>
        <Reveal delay={0.05}><p className="dim" style={{ textAlign: "center", maxWidth: "50ch", margin: "0 auto 3rem" }}>Two steps: translate the activity into a "fingerprint", then paint the image from that fingerprint.</p></Reveal>
        <Reveal delay={0.1}>
          <div className="pipeline">
            <div className="pipe-node">
              <div className="frame"><img src={assetUrl(A, ex.input as string)} alt="Brain activity" /></div>
              <div className="cap ui-label">Brain activity</div>
            </div>
            <div className="pipe-connector"><span className="op">Regression</span><span className="pipe-signal" /></div>
            <div className="pipe-node">
              <div className="frame abstract"><span>≈ 768<br />numbers<br /><span className="faint" style={{ fontWeight: 400, fontSize: "var(--text-xs)" }}>CLIP fingerprint</span></span></div>
              <div className="cap ui-label">Fingerprint</div>
            </div>
            <div className="pipe-connector"><span className="op">Diffusion</span><span className="pipe-signal" style={{ animationDelay: "1.3s" }} /></div>
            <div className="pipe-node">
              <div className="frame"><img src={assetUrl(A, ex.recon[primary])} alt="Reconstructed image" /></div>
              <div className="cap ui-label">Reconstructed image</div>
            </div>
          </div>
        </Reveal>
        {ex.gt.path && (
          <Reveal delay={0.15}>
            <div style={{ textAlign: "center", marginTop: "3rem" }}>
              <p className="dim">And here's what the subject was <em>actually</em> looking at:</p>
              <figure style={{ margin: "1rem auto 0", width: "min(220px,62vw)" }}>
                <div style={{ aspectRatio: 1, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--line-strong)" }}>
                  <img src={assetUrl(A, ex.gt.path)} alt="Image actually seen" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <figcaption className="ui-label" style={{ marginTop: "0.6rem", textAlign: "center", color: "var(--cyan)" }}>Seen · ground truth</figcaption>
              </figure>
            </div>
          </Reveal>
        )}
      </section>

      {/* STEP BY STEP */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "2rem" }}>In detail</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1.25rem" }}>
          {[
            { icon: ScanLine, t: "1 · Measure", d: "The fMRI records blood oxygenation, a proxy for neural activity, across ~15,700 voxels of the visual cortex." },
            { icon: Brain, t: "2 · Translate", d: "A regression learns the link between activity and \"fingerprint\" (a CLIP vector), the space where images live too." },
            { icon: Cpu, t: "3 · Generate", d: "A diffusion model starts from this predicted fingerprint and paints an image consistent with it." },
            { icon: Sparkles, t: "4 · No cheating", d: "The model never sees the original photo: it only has the fingerprint derived from the brain." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 0.07}>
              <div className="panel-card" style={{ padding: "1.5rem", height: "100%" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)" }}><s.icon size={22} /></div>
                <h3 style={{ fontSize: "var(--text-lg)", marginTop: "1rem" }}>{s.t}</h3>
                <p className="dim" style={{ marginTop: "0.5rem", fontSize: "var(--text-sm)" }}>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TWO MODELS */}
      {other && (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "0.6rem" }}>Two models, two levels of fidelity</h2></Reveal>
          <Reveal delay={0.05}><p className="dim" style={{ maxWidth: "56ch", marginBottom: "2rem" }}>The same brain signal, decoded by two methods. On the left, the state of the art (MindEye2); on the right, a simpler approach (Brain-Diffuser).</p></Reveal>
          <Reveal delay={0.1}>
            <div className="panel-card" style={{ padding: "clamp(1rem,3vw,2rem)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
                {[{ m: primary, tag: "SOTA" }, { m: other, tag: "simple" }, { m: null, tag: "" }].map((c, i) => {
                  const src = c.m ? assetUrl(A, ex.recon[c.m] ?? "") : assetUrl(A, ex.gt.path as string);
                  const label = c.m ?? "seen (real)";
                  return (
                    <figure key={i} style={{ margin: 0 }}>
                      <div style={{ aspectRatio: 1, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line)" }}>
                        <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <figcaption className="panel-cap"><span className="dot" style={{ background: c.m ? "var(--magenta)" : "var(--cyan)" }} /><span className="ui-label">{label}{c.tag ? ` · ${c.tag}` : ""}</span></figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* WHAT IT DOES / DOESN'T DO */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>
          <Reveal>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--good)" }}>What it does</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Recovers the meaning and mood of a scene (category, setting, composition).",
                  "Works on images never seen during training.",
                  "Reproduces published work (MindEye2, Brain-Diffuser) on open data."].map((t) => (
                  <li key={t}><Check className="ic" size={17} color="var(--good)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--bad)" }}>What it doesn't do</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["No pixel-perfect reconstruction: fine details vary.",
                  "No real-time \"mind reading\": it requires an MRI scanner and a model trained per subject.",
                  "No clinical use: research demonstration only."].map((t) => (
                  <li key={t}><X className="ic" size={17} color="var(--bad)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE DATA */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)", flex: "0 0 auto" }}><Database size={22} /></div>
            <div style={{ flex: "1 1 320px" }}>
              <h3 style={{ fontSize: "var(--text-lg)" }}>The data</h3>
              <p className="dim" style={{ marginTop: "0.5rem" }}>
                Natural Scenes Dataset (NSD, Allen et al., 2022): fMRI activity from subject {manifest.build.subject}
                viewing images from MS-COCO. {manifest.items.length} shared test images.
                Everything runs locally; no data is rehosted.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-band">
            <h2 style={{ fontSize: "var(--text-display)" }}>See for yourself.</h2>
            <p className="dim" style={{ maxWidth: "44ch", margin: "0.75rem auto 1.75rem" }}>Browse the {manifest.items.length} reconstructions, or test your own mind-reading.</p>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/gallery" className="btn btn-primary">Explore the gallery <ArrowRight size={17} /></Link>
              <Link to="/identify" className="btn btn-ghost"><Gamepad2 size={17} /> Play the guessing game</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
