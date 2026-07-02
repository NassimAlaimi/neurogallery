import { describe, it, expect } from "vitest";
import { validateManifest } from "./manifest";

const valid = {
  build: { subject: "subj01", test_set: "shared1000", methods: ["brain-diffuser"], profile: "public" },
  items: [{
    id: "0001", coco_id: 1000, category: "animal",
    recon: { "brain-diffuser": "recon/0001_brain-diffuser.png" },
    thumb: "thumbs/0001.jpg",
    gt: { displayable: false, path: null, license_name: "CC BY-NC 2.0" },
    metrics: { "brain-diffuser": { pixcorr: 0.2, ssim: 0.3 } },
  }],
};

describe("validateManifest", () => {
  it("accepts a valid manifest and returns it typed", () => {
    const m = validateManifest(valid);
    expect(m.build.subject).toBe("subj01");
    expect(m.items[0].gt.displayable).toBe(false);
  });

  it("throws when build is missing", () => {
    expect(() => validateManifest({ items: [] })).toThrow();
  });

  it("throws when an item lacks required gt fields", () => {
    const bad = structuredClone(valid);
    // @ts-expect-error suppression intentionnelle d'un champ requis
    delete bad.items[0].gt.displayable;
    expect(() => validateManifest(bad)).toThrow();
  });

  it("throws when items is not an array", () => {
    expect(() => validateManifest({ build: valid.build, items: {} })).toThrow();
  });

  it("throws when methods contains an unknown method", () => {
    const bad = structuredClone(valid);
    bad.build.methods = ["bogus"];
    expect(() => validateManifest(bad)).toThrow();
  });

  it("throws when recon is empty", () => {
    const bad = structuredClone(valid);
    // @ts-expect-error intentionally passing empty recon object
    bad.items[0].recon = {};
    expect(() => validateManifest(bad)).toThrow();
  });

  it("throws when a metric value is not a number", () => {
    const bad = structuredClone(valid);
    bad.items[0].metrics["brain-diffuser"] = { pixcorr: "bad" } as any;
    expect(() => validateManifest(bad)).toThrow();
  });

  it("throws when category is the wrong type", () => {
    const bad = structuredClone(valid);
    // @ts-expect-error intentionally passing invalid category type
    bad.items[0].category = 42;
    expect(() => validateManifest(bad)).toThrow();
  });

  it("accepts an item with category omitted", () => {
    const withoutCategory = structuredClone(valid);
    // @ts-expect-error intentionally deleting optional field to test validation
    delete withoutCategory.items[0].category;
    expect(() => validateManifest(withoutCategory)).not.toThrow();
  });
});
