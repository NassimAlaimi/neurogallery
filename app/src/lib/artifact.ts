// Base de l'artefact : le fixture en dev, remplacé par le vrai artefact en prod
// (déposé au même chemin public/sample-artifact/).
export const ARTIFACT_BASE = `${import.meta.env.BASE_URL}sample-artifact`;

export function assetUrl(base: string, relPath: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return `${b}/${p}`;
}
