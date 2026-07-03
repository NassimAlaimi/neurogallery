import { useState } from "react";
import { dreamAsset, type DreamExample } from "../../lib/dreams";

/** Carte d'un rêve : rendu onirique (repli si absent) + catégories réelles + honnêteté. */
export function DreamPlate({ dream }: { dream: DreamExample }) {
  const [failed, setFailed] = useState(false);
  const alt = `Rêve « ${dream.categories.join(", ")} » — rendu illustratif`;

  return (
    <figure className="dream-plate">
      <div className="dream-render-frame">
        {failed ? (
          <div className="dream-fallback" aria-label={alt}>
            <span>{dream.categories.join(" · ")}</span>
          </div>
        ) : (
          <img
            className="dream-render"
            src={dreamAsset(dream.render)}
            alt={alt}
            width={512}
            height={512}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
        <span className="dream-badge ui-label">rendu illustratif</span>
      </div>

      <figcaption className="dream-body">
        <div className="dream-cats">
          {dream.categories.map((c) => (
            <span key={c} className="cat-chip">{c}</span>
          ))}
        </div>
        <p className="dream-report">{dream.report_reconstructed}</p>
        <p className="dream-report-note faint ui-label">
          Reconstitué à partir des catégories décodées
        </p>
      </figcaption>
    </figure>
  );
}
