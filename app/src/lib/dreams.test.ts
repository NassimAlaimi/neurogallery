import { describe, it, expect } from "vitest";
import { validateDreams, type Dreams } from "./dreams";

const valid: Dreams = {
  study: {
    title: "Neural Decoding of Visual Imagery During Sleep",
    authors: "Horikawa, Tamaki, Miyawaki, Kamitani",
    venue: "Science", year: 2013, subjects: 3,
    awakenings_per_subject: "~200", window_seconds: 9, window_volumes: 3,
    source_url: "https://example.org",
  },
  examples: [
    { id: "dream-01", featured: true, categories: ["personne", "rue"],
      report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg" },
  ],
  study_metrics: { pairwise_accuracy_pct: 60, note: "mesure d'étude" },
  sources: [{ label: "Horikawa 2013", url: "https://example.org" }],
};

describe("validateDreams", () => {
  it("accepte un contrat valide", () => {
    expect(validateDreams(valid)).toEqual(valid);
  });

  it("rejects a non-object root", () => {
    expect(() => validateDreams(null)).toThrow(/Invalid dreams/);
  });

  it("rejette des examples vides", () => {
    expect(() => validateDreams({ ...valid, examples: [] })).toThrow(/examples/);
  });

  it("rejette des categories vides sur un exemple", () => {
    const bad = { ...valid, examples: [{ ...valid.examples[0], categories: [] }] };
    expect(() => validateDreams(bad)).toThrow(/categories/);
  });

  it("rejette un report_reconstructed manquant", () => {
    const ex = { ...valid.examples[0] } as Record<string, unknown>;
    delete ex.report_reconstructed;
    expect(() => validateDreams({ ...valid, examples: [ex] })).toThrow(/report_reconstructed/);
  });

  it("rejette un pairwise_accuracy_pct hors de 0-100", () => {
    const bad = { ...valid, study_metrics: { ...valid.study_metrics, pairwise_accuracy_pct: 150 } };
    expect(() => validateDreams(bad)).toThrow(/pairwise_accuracy_pct/);
  });

  it("rejette un render vide sur un exemple", () => {
    const bad = { ...valid, examples: [{ ...valid.examples[0], render: "" }] };
    expect(() => validateDreams(bad)).toThrow(/render/);
  });
});
