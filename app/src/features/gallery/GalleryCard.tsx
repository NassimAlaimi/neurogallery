import { Link } from "react-router-dom";
import { assetUrl } from "../../lib/artifact";
import { Gauge } from "../../components/ui/Gauge";
import type { Item } from "../../lib/manifest";

const PRIMARY_METRIC = "clip";

export function GalleryCard({ item, method, base }: { item: Item; method: string; base: string }) {
  const metrics = item.metrics[method] ?? {};
  const primary = metrics[PRIMARY_METRIC] ?? Object.values(metrics)[0] ?? 0;
  return (
    <Link to={`/item/${item.id}`} className="card" data-testid="gallery-card">
      <img src={assetUrl(base, item.thumb)} alt={`Reconstruction ${item.id}`} width={256} height={256} loading="lazy" />
      <Gauge value={primary} label={PRIMARY_METRIC in metrics ? "CLIP" : "score"} />
    </Link>
  );
}
