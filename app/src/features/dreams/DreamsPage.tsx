import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Check, X, ArrowRight, BookOpen } from "lucide-react";
import { useDreams } from "../../hooks/useDreams";
import { Reveal } from "../../components/Reveal";
import { Awakening } from "./Awakening";
import { DreamPlate } from "./DreamPlate";
import { dreamAsset, type DreamExample } from "../../lib/dreams";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
}

const abstractSub = { fontWeight: 400, fontSize: "var(--text-xs)" } as const;

/** Vignette du rêve pour le schéma : l'image générée, ou un repli dégradé si absente. */
function RenderFrame({ dream }: { dream: DreamExample }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="frame abstract">
        <span>rêve<br /><span className="faint" style={abstractSub}>rendu illustratif</span></span>
      </div>
    );
  }
  return (
    <div className="frame">
      <img
        src={dreamAsset(dream.render)}
        alt="Rêve reconstruit — rendu illustratif"
        width={220} height={220} loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function DreamsPage() {
  const { dreams, loading, error } = useDreams();
  const reduce = useReducedMotion();

  if (loading) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Rêves</h1><p className="dim">Chargement…</p></Shell>;
  if (error || !dreams) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Impossible de charger les rêves.</h1></Shell>;

  const hero = dreams.examples.find((e) => e.featured) ?? dreams.examples[0];
  const others = dreams.examples.filter((e) => e.id !== hero.id);
  const s = dreams.study;

  return (
    <div className="dream-night">
      {/* HERO */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,6rem)", paddingBottom: "clamp(1rem,3vw,2rem)" }}>
        <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Moon size={14} /> À la frontière du sommeil
        </motion.p>
        <motion.h1 className="hero-title" style={{ fontSize: "var(--text-display)", margin: "1.1rem 0 1.2rem" }}
          initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>
          Et pendant<br /><span className="grad-text">qu'on dort ?</span>
        </motion.h1>
        <motion.p className="explain-lead" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}>
          Cette galerie reconstruit ce qu'une personne <strong>regarde</strong>. Ici, on pousse
          l'idée un cran plus loin : peut-on décoder ce qu'elle <strong>rêve</strong> ? Le même
          cortex visuel s'active en rêvant qu'en regardant — et en 2013, l'équipe de Kamitani l'a
          fait. Voici comment, et jusqu'où c'est vrai.
        </motion.p>
      </section>

      {/* COMMENT ÇA MARCHE — pipeline expliquée ici */}
      <section className="wrap section" style={{ paddingTop: "1.5rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>Comment ça <span className="grad-text">marche</span></h2></Reveal>
        <Reveal delay={0.05}>
          <p className="dim" style={{ textAlign: "center", maxWidth: "56ch", margin: "0 auto 2.75rem" }}>
            Exactement la chaîne de NeuroGallery — <em>activité cérébrale → catégories → image</em> —
            mais le décodeur est entraîné sur la perception <strong style={{ color: "var(--ink)" }}>éveillée</strong>,
            puis appliqué au <strong style={{ color: "var(--ink)" }}>sommeil</strong>.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="pipeline">
            <div className="pipe-node">
              <div className="frame abstract"><span>Activité<br />cérébrale<br /><span className="faint" style={abstractSub}>pendant le sommeil</span></span></div>
              <div className="cap ui-label">Cerveau · sommeil</div>
            </div>
            <div className="pipe-connector"><span className="op" style={{ color: "var(--cyan)" }}>Décodeur · réel</span><span className="pipe-signal" /></div>
            <div className="pipe-node">
              <div className="frame abstract"><span>{hero.categories.join(" · ")}<br /><span className="faint" style={abstractSub}>catégories décodées</span></span></div>
              <div className="cap ui-label">Catégories · réel</div>
            </div>
            <div className="pipe-connector"><span className="op" style={{ color: "var(--magenta)" }}>Diffusion · notre rendu</span><span className="pipe-signal" style={{ animationDelay: "1.3s" }} /></div>
            <div className="pipe-node">
              <RenderFrame dream={hero} />
              <div className="cap ui-label">Rêve · rendu illustratif</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="dim" style={{ textAlign: "center", maxWidth: "62ch", margin: "1.75rem auto 0", fontSize: "var(--text-sm)" }}>
            <strong style={{ color: "var(--cyan)" }}>En bleu</strong> : mesuré dans le cerveau et décodé (Kamitani&nbsp;2013).{" "}
            <strong style={{ color: "var(--magenta)" }}>En magenta</strong> : notre rendu illustratif — un rêve n'a pas d'image de référence.{" "}
            <Link to="/explain" className="inline-link">La méthode en détail</Link>.
          </p>
        </Reveal>
      </section>

      {/* PROTOCOLE RÉEL */}
      <section className="wrap section" style={{ paddingTop: "2rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>Le protocole, réel</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
          {[
            { n: "01", t: "Dormir en IRMf", d: `${s.subjects} sujets endormis dans le scanner, EEG simultané.` },
            { n: "02", t: "Détecter l'endormissement", d: "L'EEG repère la signature du sleep-onset (NREM)." },
            { n: "03", t: "Réveiller & demander", d: `« Qu'as-tu vu ? » — ${s.awakenings_per_subject} réveils par sujet.` },
            { n: "04", t: "Décoder 9 s d'activité", d: `Les ${s.window_volumes} volumes (${s.window_seconds}s) avant le réveil sont décodés.` },
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

      {/* PIÈCE MAÎTRESSE */}
      <section className="wrap section" style={{ paddingTop: "1rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>Un <span className="grad-text">réveil</span></h2></Reveal>
        <Reveal delay={0.05}><p className="dim" style={{ textAlign: "center", maxWidth: "48ch", margin: "0 auto 2.5rem" }}>Du sommeil à l'image : ce que le cerveau encodait, décodé puis rendu.</p></Reveal>
        <Reveal delay={0.1}><Awakening dream={hero} metrics={dreams.study_metrics} /></Reveal>
      </section>

      {/* RÊVES SECONDAIRES */}
      {others.length > 0 && (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>D'autres rêves</h2></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem" }}>
            {others.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.08}><DreamPlate dream={d} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CE QUE ÇA FAIT / NE FAIT PAS */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>
          <Reveal>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--good)" }}>Ce que ça fait</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Retrouve des catégories réellement rêvées, mieux que le hasard.",
                  "S'appuie sur le même cortex visuel qu'en perception éveillée.",
                  "Repose sur des données publiées et ouvertes (Kamitani Lab)."].map((t) => (
                  <li key={t}><Check className="ic" size={17} color="var(--good)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--bad)" }}>Ce que ça ne fait pas</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["L'image montrée est un rendu illustratif, pas une image vue du rêve.",
                  "Pas de vérité-pixel : un rêve n'a pas d'image de référence.",
                  "Le décodage robuste est au niveau catégorie, pas photo nette."].map((t) => (
                  <li key={t}><X className="ic" size={17} color="var(--bad)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2013 → 2025 + SOURCES */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-band">
            <h2 style={{ fontSize: "var(--text-title)" }}>2013 → aujourd'hui</h2>
            <p className="dim" style={{ maxWidth: "52ch", margin: "0.75rem auto 1.5rem" }}>
              De la catégorie (2013) à la « vidéo de rêve » reconstruite (2025). Le champ avance
              vite — et reste honnête sur le flou du résultat.
            </p>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/explain" className="btn btn-primary"><BookOpen size={17} /> La méthode</Link>
              <Link to="/gallery" className="btn btn-ghost">La galerie <ArrowRight size={17} /></Link>
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
