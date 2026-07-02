import type { FilterState } from "../../lib/urlState";

export function Filters({
  categories, methods, state, onChange,
}: {
  categories: string[]; methods: string[];
  state: FilterState; onChange: (next: FilterState) => void;
}) {
  return (
    <div className="filters" role="group" aria-label="Filtres">
      <label>Méthode
        <select value={state.method} onChange={(e) => onChange({ ...state, method: e.target.value })}>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label>Catégorie
        <select value={state.category} onChange={(e) => onChange({ ...state, category: e.target.value })}>
          <option value="all">Toutes</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label><input type="checkbox" checked={state.gtOnly}
        onChange={(e) => onChange({ ...state, gtOnly: e.target.checked })} /> Source visible</label>
      <label>Tri
        <select value={state.sort} onChange={(e) => onChange({ ...state, sort: e.target.value as FilterState["sort"] })}>
          <option value="none">—</option>
          <option value="best">Meilleures</option>
          <option value="worst">Pires</option>
        </select>
      </label>
    </div>
  );
}
