import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Brain, Check, X, ArrowRight, BookOpen } from "lucide-react";
import { useDreams } from "../../hooks/useDreams";
import { Reveal } from "../../components/Reveal";
import { Awakening } from "./Awakening";
import { DreamPlate } from "./DreamPlate";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
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
          Le même cortex visuel s'active en rêvant qu'en regardant. En 2013, l'équipe de
          Kamitani a décodé le <em>contenu de rêves</em> depuis l'IRMf. Voici comment — et
          jusqu'où c'est vrai.
        </motion.p>
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

      {/* PONT AVEC LE PIPELINE */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)", flex: "0 0 auto" }}><Brain size={22} /></div>
            <div style={{ flex: "1 1 320px" }}>
              <h3 style={{ fontSize: "var(--text-lg)" }}>Le même problème que cette galerie</h3>
              <p className="dim" style={{ marginTop: "0.5rem" }}>
                Décoder un rêve, c'est la chaîne <em>activité → empreinte → image</em>, exactement
                comme NeuroGallery — mais entraînée sur la perception éveillée et appliquée au sommeil.{" "}
                <Link to="/explain" className="inline-link">Voir la méthode en clair</Link>.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

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
