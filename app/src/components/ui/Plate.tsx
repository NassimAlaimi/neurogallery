import { assetUrl } from "../../lib/artifact";
import type { Item } from "../../lib/manifest";

export function Plate({ item, method, base }: { item: Item; method: string; base: string }) {
  const reconPath = item.recon[method];
  const showGt = item.gt.displayable && item.gt.path;
  return (
    <div className="plate">
      <figure>
        <figcaption className="ui-label">Reconstruit</figcaption>
        <img src={assetUrl(base, reconPath)} alt={`Reconstruction ${item.id}`} width={256} height={256} />
      </figure>
      <figure>
        <figcaption className="ui-label">Vu</figcaption>
        {showGt ? (
          <img src={assetUrl(base, item.gt.path!)} alt={`Image vue ${item.id}`} width={256} height={256} />
        ) : (
          <div className="gt-hidden" role="img" aria-label="Source masquée (licence restrictive)">
            <span>Source masquée<br />(licence : {item.gt.license_name})</span>
          </div>
        )}
      </figure>
    </div>
  );
}
