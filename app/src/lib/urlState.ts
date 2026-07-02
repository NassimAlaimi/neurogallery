import type { Item } from "./manifest";

export interface FilterState {
  method: string;
  category: string;
  gtOnly: boolean;
  sort: "none" | "best" | "worst";
}

export const DEFAULT_FILTERS: FilterState = {
  method: "",
  category: "all",
  gtOnly: false,
  sort: "none",
};

export function parseFilters(params: URLSearchParams): FilterState {
  const sort = params.get("sort");
  return {
    method: params.get("method") ?? DEFAULT_FILTERS.method,
    category: params.get("category") ?? DEFAULT_FILTERS.category,
    gtOnly: params.get("gtOnly") === "1",
    sort: sort === "best" || sort === "worst" ? sort : "none",
  };
}

export function filtersToParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.method) p.set("method", state.method);
  if (state.category !== "all") p.set("category", state.category);
  if (state.gtOnly) p.set("gtOnly", "1");
  if (state.sort !== "none") p.set("sort", state.sort);
  return p;
}

export function applyFilters(items: Item[], state: FilterState, sortMetric: string): Item[] {
  const method = state.method || undefined;
  const filtered = items.filter((it) => {
    if (method && !(method in it.recon)) return false;
    if (state.category !== "all" && it.category !== state.category) return false;
    if (state.gtOnly && !it.gt.displayable) return false;
    return true;
  });
  if (state.sort === "none") return filtered;

  // Determine which method to use for scoring: explicit method or first available from items
  const scoreMethod = method || (filtered.length > 0 ? Object.keys(filtered[0].metrics)[0] : undefined);
  if (!scoreMethod) return filtered;

  const score = (it: Item) => it.metrics[scoreMethod]?.[sortMetric] ?? 0;
  // copie avant tri : ne pas muter l'entrée
  return [...filtered].sort((a, b) =>
    state.sort === "best" ? score(b) - score(a) : score(a) - score(b),
  );
}
