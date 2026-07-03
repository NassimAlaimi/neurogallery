import { matchedSet } from "../../lib/dreams";

/** Reported (dataset) vs decoded (our reproduction) chips, with overlap highlighted. */
export function CategoryCompare({ reported, decoded }: { reported: string[]; decoded: string[] }) {
  const match = matchedSet(reported, decoded);
  const chip = (c: string, i: number, prefix: string) => (
    <span key={`${prefix}-${c}-${i}`} className={`cat-chip${match.has(c.toLowerCase()) ? " match" : ""}`}>{c}</span>
  );
  return (
    <div className="cat-compare">
      <div className="cat-row">
        <span className="cat-row-label ui-label">Reported (dataset)</span>
        <div className="dream-cats">{reported.map((c, i) => chip(c, i, "r"))}</div>
      </div>
      <div className="cat-row">
        <span className="cat-row-label ui-label" style={{ color: "var(--cyan)" }}>Decoded (our reproduction)</span>
        <div className="dream-cats">{decoded.map((c, i) => chip(c, i, "d"))}</div>
      </div>
    </div>
  );
}
