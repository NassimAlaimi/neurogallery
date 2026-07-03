import { assetUrl } from "../../lib/artifact";
import type { Item } from "../../lib/manifest";

export function Plate({ item, method, base }: { item: Item; method: string; base: string }) {
  const reconPath = item.recon[method] ?? Object.values(item.recon)[0];
  // On affiche la vérité-terrain dès qu'un fichier existe (path). Le build a déjà
  // tranché : en profil public, path est nul pour les licences restrictives ; en
  // local, path est toujours présent. `displayable` reste une étiquette (licence).
  const showGt = item.gt.path !== null;
  return (
    <div className="plate">
      {item.input ? (
        <figure>
          <figcaption className="ui-label">Activité cérébrale (input)</figcaption>
          <img src={assetUrl(base, item.input)} alt={`Activité cérébrale ${item.id}`} width={256} height={256} />
        </figure>
      ) : null}
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
