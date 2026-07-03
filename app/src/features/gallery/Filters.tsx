import { Eye } from "lucide-react";
import type { FilterState } from "../../lib/urlState";

export function Filters({
  categories, methods, state, onChange,
}: {
  categories: string[]; methods: string[];
  state: FilterState; onChange: (next: FilterState) => void;
}) {
  return (
    <div className="filters" role="group" aria-label="Filtres">
      <label className="field">
        <span>Méthode</span>
        <select className="select" value={state.method}
          onChange={(e) => onChange({ ...state, method: e.target.value })}>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Catégorie</span>
        <select className="select" value={state.category}
          onChange={(e) => onChange({ ...state, category: e.target.value })}>
          <option value="all">Toutes</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Tri</span>
        <select className="select" value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as FilterState["sort"] })}>
          <option value="none">—</option>
          <option value="best">Meilleures</option>
          <option value="worst">Pires</option>
        </select>
      </label>

      <button type="button" className="chip" data-on={state.gtOnly}
        aria-pressed={state.gtOnly}
        onClick={() => onChange({ ...state, gtOnly: !state.gtOnly })}
        style={{ alignSelf: "end" }}>
        <Eye size={15} /> Source visible
      </button>
    </div>
  );
}
