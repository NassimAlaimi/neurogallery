import { motion, useReducedMotion } from "framer-motion";
import { assetUrl } from "../../lib/artifact";
import type { Item } from "../../lib/manifest";

interface PanelDef {
  key: string;
  cap: string;
  dot: string;
  alt: string;
  src: string | null;
}

/** Triptyque : Activité cérébrale (input) → Reconstruit → Vu, avec révélation en cascade. */
export function Plate({ item, method, base }: { item: Item; method: string; base: string }) {
  const reduce = useReducedMotion();
  const reconPath = item.recon[method] ?? Object.values(item.recon)[0];
  const showGt = item.gt.path !== null;

  const panels: PanelDef[] = [
    ...(item.input
      ? [{ key: "in", cap: "Activité cérébrale", dot: "var(--violet)",
           alt: `Activité cérébrale ${item.id}`, src: assetUrl(base, item.input) }]
      : []),
    { key: "re", cap: "Reconstruit", dot: "var(--magenta)",
      alt: `Reconstruction ${item.id}`, src: assetUrl(base, reconPath) },
    { key: "gt", cap: "Vu", dot: "var(--cyan)",
      alt: showGt ? `Image vue ${item.id}` : "",
      src: showGt ? assetUrl(base, item.gt.path as string) : null },
  ];

  return (
    <div className="triptych">
      {panels.map((p, i) => (
        <motion.figure
          key={p.key}
          className="panel"
          style={{ margin: 0 }}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="frame">
            {p.src ? (
              <img src={p.src} alt={p.alt} width={512} height={512} loading="lazy" />
            ) : (
              <div className="gt-hidden" role="img" aria-label="Source masquée (licence restrictive)">
                <span>Source masquée<br />(licence : {item.gt.license_name})</span>
              </div>
            )}
          </div>
          <figcaption className="panel-cap">
            <span className="dot" style={{ background: p.dot }} />
            <span className="ui-label">{p.cap}</span>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}
