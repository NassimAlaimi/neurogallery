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

  if (loading) return <Shell><h1 className="hero-title" style={{ fontSize: "var(--text-display)" }}>Explication</h1><p className="dim">Chargement…</p></Shell>;
  if (error || !manifest) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Impossible de charger.</h1></Shell>;

  const primary = manifest.build.methods.includes("mindeye2") ? "mindeye2" : manifest.build.methods[0];
  const other = manifest.build.methods.find((m) => m !== primary);
  // exemple fil rouge : la meilleure reconstruction (avec input + vérité-terrain)
  const withGt = manifest.items.filter((i) => i.gt.path && i.input && primary in i.recon);
  const ex = [...withGt].sort((a, b) => px(b, primary) - px(a, primary))[0] ?? manifest.items[0];
  const A = ARTIFACT_BASE;

  return (
    <>
      {/* HERO */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,6rem)", paddingBottom: "clamp(1rem,3vw,2rem)" }}>
        <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="pulse" /> La méthode, en clair
        </motion.p>
        <motion.h1 className="hero-title" style={{ fontSize: "var(--text-display)", margin: "1.1rem 0 1.2rem" }}
          initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>
          Lire dans un cerveau,<br /><span className="grad-text">expliqué.</span>
        </motion.h1>
        <motion.p className="explain-lead" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}>
          Pas de magie ni de télépathie. Juste des mesures, un peu de statistiques,
          et un modèle génératif. Voici comment une image naît d'une simple activité cérébrale.
        </motion.p>
      </section>

      {/* LE PRINCIPE */}
      <section className="wrap section" style={{ paddingTop: "2.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(1.5rem,4vw,3rem)", alignItems: "center" }}>
          <Reveal>
            <div>
              <span className="ui-label" style={{ color: "var(--cyan)" }}>Le principe</span>
              <h2 style={{ fontSize: "var(--text-title)", margin: "0.6rem 0 1rem" }}>Regarder, c'est activer.</h2>
              <p className="dim">
                Quand le sujet observe une image, son <strong style={{ color: "var(--ink)" }}>cortex visuel</strong> (à l'arrière du crâne)
                s'active selon un motif propre à cette image. Un IRMf mesure cette activité : environ
                <strong style={{ color: "var(--ink)" }}> 15 700 valeurs</strong>, une par petit cube de cerveau (« voxel »).
                Ce motif — invisible et abstrait pour nous — contient une empreinte de ce qui est vu.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <figure className="panel-card" style={{ padding: "1rem", margin: 0 }}>
              <div style={{ aspectRatio: 1, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line)" }}>
                <img src={assetUrl(A, ex.input as string)} alt="Activité cérébrale (coupes IRMf)" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <figcaption className="ui-label" style={{ marginTop: "0.7rem", textAlign: "center" }}>Activité cérébrale réelle · cortex visuel</figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* PIPELINE (showpiece) */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>Du <span className="grad-text">signal</span> à l'image</h2></Reveal>
        <Reveal delay={0.05}><p className="dim" style={{ textAlign: "center", maxWidth: "50ch", margin: "0 auto 3rem" }}>Deux étapes : traduire l'activité en « empreinte », puis peindre l'image à partir de cette empreinte.</p></Reveal>
        <Reveal delay={0.1}>
          <div className="pipeline">
            <div className="pipe-node">
              <div className="frame"><img src={assetUrl(A, ex.input as string)} alt="Activité cérébrale" /></div>
              <div className="cap ui-label">Activité cérébrale</div>
            </div>
            <div className="pipe-connector"><span className="op">Régression</span><span className="pipe-signal" /></div>
            <div className="pipe-node">
              <div className="frame abstract"><span>≈ 768<br />nombres<br /><span className="faint" style={{ fontWeight: 400, fontSize: "var(--text-xs)" }}>empreinte CLIP</span></span></div>
              <div className="cap ui-label">Empreinte</div>
            </div>
            <div className="pipe-connector"><span className="op">Diffusion</span><span className="pipe-signal" style={{ animationDelay: "1.3s" }} /></div>
            <div className="pipe-node">
              <div className="frame"><img src={assetUrl(A, ex.recon[primary])} alt="Image reconstruite" /></div>
              <div className="cap ui-label">Image reconstruite</div>
            </div>
          </div>
        </Reveal>
        {ex.gt.path && (
          <Reveal delay={0.15}>
            <div style={{ textAlign: "center", marginTop: "3rem" }}>
              <p className="dim">Et voici ce que le sujet regardait <em>réellement</em> :</p>
              <figure style={{ margin: "1rem auto 0", width: "min(220px,62vw)" }}>
                <div style={{ aspectRatio: 1, borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--line-strong)" }}>
                  <img src={assetUrl(A, ex.gt.path)} alt="Image réellement vue" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <figcaption className="ui-label" style={{ marginTop: "0.6rem", textAlign: "center", color: "var(--cyan)" }}>Vu · vérité-terrain</figcaption>
              </figure>
            </div>
          </Reveal>
        )}
      </section>

      {/* ÉTAPE PAR ÉTAPE */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "2rem" }}>En détail</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1.25rem" }}>
          {[
            { icon: ScanLine, t: "1 · Mesurer", d: "L'IRMf enregistre l'oxygénation du sang, proxy de l'activité neuronale, dans ~15 700 voxels du cortex visuel." },
            { icon: Brain, t: "2 · Traduire", d: "Une régression apprend le lien activité → « empreinte » (un vecteur CLIP), l'espace où vivent aussi les images." },
            { icon: Cpu, t: "3 · Générer", d: "Un modèle de diffusion part de cette empreinte prédite et peint une image cohérente avec elle." },
            { icon: Sparkles, t: "4 · Aucune triche", d: "Le modèle ne voit jamais la photo d'origine : il ne dispose que de l'empreinte issue du cerveau." },
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

      {/* DEUX MODÈLES */}
      {other && (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "0.6rem" }}>Deux modèles, deux niveaux de fidélité</h2></Reveal>
          <Reveal delay={0.05}><p className="dim" style={{ maxWidth: "56ch", marginBottom: "2rem" }}>Le même signal cérébral, décodé par deux méthodes. À gauche l'état de l'art (MindEye2), à droite une approche plus simple (Brain-Diffuser).</p></Reveal>
          <Reveal delay={0.1}>
            <div className="panel-card" style={{ padding: "clamp(1rem,3vw,2rem)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
                {[{ m: primary, tag: "SOTA" }, { m: other, tag: "simple" }, { m: null, tag: "" }].map((c, i) => {
                  const src = c.m ? assetUrl(A, ex.recon[c.m] ?? "") : assetUrl(A, ex.gt.path as string);
                  const label = c.m ?? "vu (réel)";
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

      {/* CE QUE ÇA FAIT / NE FAIT PAS */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>
          <Reveal>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--good)" }}>Ce que ça fait</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Retrouve le sens et l'ambiance d'une scène (catégorie, décor, composition).",
                  "Fonctionne sur des images jamais vues à l'entraînement.",
                  "Reproduit des travaux publiés (MindEye2, Brain-Diffuser) sur des données ouvertes."].map((t) => (
                  <li key={t}><Check className="ic" size={17} color="var(--good)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--bad)" }}>Ce que ça ne fait pas</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Pas de reconstruction pixel-perfect : les détails fins varient.",
                  "Pas de « lecture de pensée » en temps réel : il faut un IRM et un modèle entraîné par sujet.",
                  "Pas d'usage clinique : démonstration de recherche uniquement."].map((t) => (
                  <li key={t}><X className="ic" size={17} color="var(--bad)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LES DONNÉES */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)", flex: "0 0 auto" }}><Database size={22} /></div>
            <div style={{ flex: "1 1 320px" }}>
              <h3 style={{ fontSize: "var(--text-lg)" }}>Les données</h3>
              <p className="dim" style={{ marginTop: "0.5rem" }}>
                Natural Scenes Dataset (NSD, Allen et al., 2022) — activité IRMf du sujet {manifest.build.subject}
                observant des images de MS-COCO. {manifest.items.length} images de test partagées.
                Tout tourne en local ; aucune donnée n'est rehébergée.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-band">
            <h2 style={{ fontSize: "var(--text-display)" }}>À toi de voir.</h2>
            <p className="dim" style={{ maxWidth: "44ch", margin: "0.75rem auto 1.75rem" }}>Parcours les {manifest.items.length} reconstructions, ou teste ta propre lecture de pensée.</p>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/gallery" className="btn btn-primary">Explorer la galerie <ArrowRight size={17} /></Link>
              <Link to="/identify" className="btn btn-ghost"><Gamepad2 size={17} /> Jouer à deviner</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
