import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Awakening } from "./Awakening";
import type { DreamExample, DreamMetrics } from "../../lib/dreams";

// Seam mutable utilisé par le mock ci-dessous : les tests le positionnent
// avant chaque rendu pour piloter la décision reduced-motion sans dépendre
// des singletons internes de framer-motion (motion-dom) ni de matchMedia.
let mockReduced = false;

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => mockReduced };
});

const dream: DreamExample = {
  id: "dream-01", featured: true, categories: ["person", "street"],
  report_reconstructed: "A street.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg",
};
const metrics: DreamMetrics = { pairwise_accuracy_pct: 60, note: "study measure" };

// STEP_MS du composant (non exporté) : on avance d'un multiple généreux pour
// traverser toute la chaîne sleeping→onset→awake→decoding→forming→truth (5 pas).
const STEP_MS = 1400;

afterEach(() => {
  vi.useRealTimers();
  mockReduced = false;
});

describe("Awakening", () => {
  it("sous reduced-motion, montre les catégories, le rendu illustratif et la carte de vérité", () => {
    mockReduced = true;
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText("person")).toBeInTheDocument();
    expect(screen.getByText("street")).toBeInTheDocument();
    expect(screen.getAllByText(/illustrative render/i).length).toBeGreaterThan(0);
    // truth card: real vs render distinction
    expect(screen.getByText(/activity \+ categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Horikawa/i)).toBeInTheDocument();
  });

  it("shows the study measure without presenting it as a per-awakening output", () => {
    mockReduced = true;
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/study measure/i)).toBeInTheDocument();
  });

  describe("sans reduced-motion (chaîne de timers auto-avance)", () => {
    it("avance automatiquement sleeping→…→truth via la cadence de setTimeout", () => {
      mockReduced = false;
      vi.useFakeTimers();

      const { container } = render(<Awakening dream={dream} metrics={metrics} />);
      const root = () => container.querySelector(".awakening");

      // Premier rendu : la chaîne n'a pas encore progressé.
      expect(root()?.className).toContain("awakening-sleeping");
      expect(root()?.className).not.toContain("awakening-truth");

      // 5 pas séparent sleeping de truth. Chaque pas ne planifie le setTimeout
      // suivant qu'une fois l'effet React flushé après le changement d'état ;
      // on avance donc STEP_MS à la fois (7 fois, avec marge) plutôt qu'en un
      // seul bond, pour laisser React flush l'effet entre deux avancées.
      for (let step = 0; step < 7; step += 1) {
        act(() => {
          vi.advanceTimersByTime(STEP_MS);
        });
      }

      expect(root()?.className).toContain("awakening-truth");
    });

    it("nettoie son timer au démontage (aucune mise à jour d'état après unmount)", () => {
      mockReduced = false;
      vi.useFakeTimers();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const { unmount } = render(<Awakening dream={dream} metrics={metrics} />);

      // Laisse la chaîne progresser d'un pas puis démonte pendant qu'un timer
      // est encore en vol : le cleanup de l'effet doit l'annuler (clearTimeout).
      act(() => {
        vi.advanceTimersByTime(STEP_MS);
      });

      unmount();

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(STEP_MS * 6);
        });
      }).not.toThrow();

      const hasUnmountedUpdateWarning = consoleError.mock.calls.some(([message]) =>
        typeof message === "string" && /unmounted component/i.test(message)
      );
      expect(hasUnmountedUpdateWarning).toBe(false);
    });
  });
});
