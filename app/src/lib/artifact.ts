// Artifact base: the fixture in dev, replaced by the real artifact in prod
// (dropped at the same public/sample-artifact/ path).
export const ARTIFACT_BASE = `${import.meta.env.BASE_URL}sample-artifact`;

export function assetUrl(base: string, relPath: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return `${b}/${p}`;
}
