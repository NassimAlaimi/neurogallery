import { describe, it, expect } from "vitest";
import { buildRound, eligibleItems, isCorrect } from "./identify";
import type { Item } from "./manifest";

function it_(id: string, displayable: boolean): Item {
  return {
    id, coco_id: Number(id), category: "a",
    recon: { "brain-diffuser": `recon/${id}.png` }, thumb: `thumbs/${id}.jpg`,
    gt: { displayable, path: displayable ? `gt/${id}.jpg` : null, license_name: "x" },
    metrics: {},
  };
}

const seqRng = (vals: number[]): (() => number) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("identify", () => {
  it("keeps only items with displayable GT", () => {
    const items = [it_("1", true), it_("2", false), it_("3", true)];
    expect(eligibleItems(items).map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("excludes items that are displayable but have null path", () => {
    const displayableWithPath = it_("1", true);
    const displayableWithoutPath: Item = {
      id: "2",
      coco_id: 2,
      category: "a",
      recon: { "brain-diffuser": "recon/2.png" },
      thumb: "thumbs/2.jpg",
      gt: { displayable: true, path: null, license_name: "x" },
      metrics: {},
    };
    const result = eligibleItems([displayableWithoutPath, displayableWithPath]);
    expect(result.map((i) => i.id)).toEqual(["1"]);
  });

  it("builds a round with the target present among distinct options", () => {
    const items = [it_("1", true), it_("2", true), it_("3", true), it_("4", true)];
    const round = buildRound(items, 4, seqRng([0, 0, 0, 0]));
    expect(round.optionIds).toContain(round.targetId);
    expect(new Set(round.optionIds).size).toBe(4);
  });

  it("throws when not enough eligible items", () => {
    expect(() => buildRound([it_("1", true), it_("2", false)], 4, Math.random)).toThrow();
  });

  it("throws when optionCount < 1", () => {
    const items = [it_("1", true), it_("2", true), it_("3", true)];
    expect(() => buildRound(items, 0, Math.random)).toThrow();
  });

  it("scores the chosen answer", () => {
    const round = { targetId: "1", optionIds: ["1", "2", "3", "4"] };
    expect(isCorrect(round, "1")).toBe(true);
    expect(isCorrect(round, "2")).toBe(false);
  });
});
