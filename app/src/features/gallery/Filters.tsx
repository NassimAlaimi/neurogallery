import { Eye } from "lucide-react";
import type { FilterState } from "../../lib/urlState";

export function Filters({
  categories, methods, state, onChange,
}: {
  categories: string[]; methods: string[];
  state: FilterState; onChange: (next: FilterState) => void;
}) {
  return (
    <div className="filters" role="group" aria-label="Filters">
      <label className="field">
        <span>Method</span>
        <select className="select" value={state.method}
          onChange={(e) => onChange({ ...state, method: e.target.value })}>
          {methods.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Category</span>
        <select className="select" value={state.category}
          onChange={(e) => onChange({ ...state, category: e.target.value })}>
          <option value="all">All</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="field">
        <span>Sort</span>
        <select className="select" value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as FilterState["sort"] })}>
          <option value="none">Default</option>
          <option value="best">Best</option>
          <option value="worst">Worst</option>
        </select>
      </label>

      <button type="button" className="chip" data-on={state.gtOnly}
        aria-pressed={state.gtOnly}
        onClick={() => onChange({ ...state, gtOnly: !state.gtOnly })}
        style={{ alignSelf: "end" }}>
        <Eye size={15} /> Show source
      </button>
    </div>
  );
}
