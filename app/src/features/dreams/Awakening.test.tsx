import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Awakening } from "./Awakening";
import type { DreamExample, DreamMetrics } from "../../lib/dreams";

const dream: DreamExample = {
  id: "dream-01", featured: true, categories: ["personne", "rue"],
  report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg",
};
const metrics: DreamMetrics = { pairwise_accuracy_pct: 60, note: "mesure d'étude" };

// test-setup.ts stub matchMedia → matches:false (pas de reduced-motion) par défaut.
// On force reduced-motion pour un rendu déterministe et complet.
function forceReducedMotion() {
  (globalThis as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (q: string) =>
    ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } } as unknown as MediaQueryList);
}

describe("Awakening", () => {
  it("sous reduced-motion, montre les catégories, le rendu illustratif et la carte de vérité", () => {
    forceReducedMotion();
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText("personne")).toBeInTheDocument();
    expect(screen.getByText("rue")).toBeInTheDocument();
    expect(screen.getAllByText(/rendu illustratif/i).length).toBeGreaterThan(0);
    // carte de vérité : distinction réel vs rendu
    expect(screen.getByText(/activité \+ catégories/i)).toBeInTheDocument();
    expect(screen.getByText(/Horikawa/i)).toBeInTheDocument();
  });

  it("affiche la mesure d'étude sans la présenter comme sortie par réveil", () => {
    forceReducedMotion();
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/mesure d'étude/i)).toBeInTheDocument();
  });
});
