import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DreamPlate } from "./DreamPlate";
import type { DreamExample } from "../../lib/dreams";

const dream: DreamExample = {
  id: "dream-01",
  featured: true,
  categories: ["personne", "rue", "bâtiment"],
  report_reconstructed: "Une rue bordée de bâtiments.",
  render: "renders/dream-01.webp",
  thumb: "thumbs/dream-01.jpg",
};

describe("DreamPlate", () => {
  it("affiche les catégories réelles", () => {
    render(<DreamPlate dream={dream} />);
    for (const c of dream.categories) {
      expect(screen.getByText(c)).toBeInTheDocument();
    }
  });

  it("affiche le rapport reconstitué avec son libellé", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(dream.report_reconstructed)).toBeInTheDocument();
    expect(screen.getByText(/Reconstitué à partir des catégories/i)).toBeInTheDocument();
  });

  it("étiquette l'image comme rendu illustratif (honnêteté)", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(/rendu illustratif/i)).toBeInTheDocument();
    // l'alt de l'image porte aussi la mention
    expect(screen.getByAltText(/rendu illustratif/i)).toBeInTheDocument();
  });

  it("ne présente jamais l'image comme 'vue' ou 'vraie image'", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.queryByText(/image vue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vrai rêve/i)).not.toBeInTheDocument();
  });
});
