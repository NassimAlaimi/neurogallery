import { useState } from "react";
import { dreamAsset, type DreamExample } from "../../lib/dreams";

interface DreamPlateProps {
  dream: DreamExample;
  /**
   * Show the decoded-category chips. Turn off when the component is embedded in
   * `Awakening`, where the same categories are already revealed by the decoding
   * phase (avoids duplicating the category text in the DOM).
   */
  showCategories?: boolean;
}

/** One dream card: oniric render (fallback if missing) + real categories + honesty. */
export function DreamPlate({ dream, showCategories = true }: DreamPlateProps) {
  const [failed, setFailed] = useState(false);
  const alt = `Dream "${dream.categories.join(", ")}", illustrative render`;

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
        <span className="dream-badge ui-label">illustrative render</span>
      </div>

      <figcaption className="dream-body">
        {showCategories && (
          <div className="dream-cats">
            {dream.categories.map((c, i) => (
              <span key={`${dream.id}-${c}-${i}`} className="cat-chip">{c}</span>
            ))}
          </div>
        )}
        <p className="dream-report">{dream.report_reconstructed}</p>
        <p className="dream-report-note faint ui-label">
          Reconstructed from the decoded categories
        </p>
      </figcaption>
    </figure>
  );
}
