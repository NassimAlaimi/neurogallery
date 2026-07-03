import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/artifact";
import { Gauge } from "../../components/ui/Gauge";
import type { Item } from "../../lib/manifest";

export function GalleryCard({
  item, method, metricKey, base,
}: { item: Item; method: string; metricKey: string; base: string }) {
  const metrics = item.metrics[method] ?? {};
  const value = metrics[metricKey] ?? Object.values(metrics)[0] ?? 0;
  const gtVisible = item.gt.path !== null;

  return (
    <Link to={`/item/${item.id}`} className="card" data-testid="gallery-card">
      <div className="card-media">
        <img src={assetUrl(base, item.thumb)} alt={`Reconstruction ${item.id}`} width={256} height={256} loading="lazy" />
        {gtVisible && (
          <img className="gt" src={assetUrl(base, item.gt.path as string)} alt={`Seen image ${item.id}`} width={256} height={256} loading="lazy" />
        )}
        {gtVisible && <span className="card-flip-hint">Seen ↔ hover</span>}
        <div className="card-meta">
          {item.category && <div className="card-cat">{item.category}</div>}
          <Gauge value={value} label={metricKey || "score"} />
        </div>
      </div>
    </Link>
  );
}
