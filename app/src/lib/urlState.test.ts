import { describe, it, expect } from "vitest";
import { parseFilters, filtersToParams, applyFilters, DEFAULT_FILTERS } from "./urlState";
import type { Item } from "./manifest";

function item(id: string, cat: string, displayable: boolean, clip: number): Item {
  return {
    id, coco_id: Number(id), category: cat,
    recon: { "brain-diffuser": `recon/${id}.png` }, thumb: `thumbs/${id}.jpg`,
    gt: { displayable, path: displayable ? `gt/${id}.jpg` : null, license_name: "x" },
    metrics: { "brain-diffuser": { clip } },
  };
}

describe("urlState", () => {
  it("round-trips filters through URLSearchParams", () => {
    const state = { method: "brain-diffuser", category: "animal", gtOnly: true, sort: "best" as const };
    const parsed = parseFilters(filtersToParams(state));
    expect(parsed).toEqual(state);
  });

  it("returns defaults for empty params", () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it("filters by category and gtOnly without mutating input", () => {
    const items = [item("1", "animal", true, 0.9), item("2", "objet", false, 0.5)];
    const out = applyFilters(items, { ...DEFAULT_FILTERS, category: "animal" }, "clip");
    expect(out.map((i) => i.id)).toEqual(["1"]);
    const outGt = applyFilters(items, { ...DEFAULT_FILTERS, gtOnly: true }, "clip");
    expect(outGt.map((i) => i.id)).toEqual(["1"]);
    expect(items.length).toBe(2); // entrée intacte
  });

  it("sorts best (desc) and worst (asc) by the metric", () => {
    const items = [item("1", "a", true, 0.2), item("2", "a", true, 0.8)];
    expect(
      applyFilters(items, { ...DEFAULT_FILTERS, method: "brain-diffuser", sort: "best" }, "clip").map((i) => i.id),
    ).toEqual(["2", "1"]);
    expect(
      applyFilters(items, { ...DEFAULT_FILTERS, method: "brain-diffuser", sort: "worst" }, "clip").map((i) => i.id),
    ).toEqual(["1", "2"]);
  });

  it("does not sort when method is empty", () => {
    const items = [item("1", "a", true, 0.2), item("2", "a", true, 0.8)];
    const out = applyFilters(items, { ...DEFAULT_FILTERS, sort: "best" }, "clip");
    expect(out.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("sort path does not mutate input order", () => {
    const items = [item("1", "a", true, 0.2), item("2", "a", true, 0.8), item("3", "a", true, 0.5)];
    const before = items.map((i) => i.id);
    applyFilters(items, { ...DEFAULT_FILTERS, method: "brain-diffuser", sort: "best" }, "clip");
    expect(items.map((i) => i.id)).toEqual(before);
  });
});
