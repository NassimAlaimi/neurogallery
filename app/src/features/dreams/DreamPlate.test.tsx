import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("masque les puces de catégories quand showCategories=false, tout en gardant badge et rapport", () => {
    render(<DreamPlate dream={dream} showCategories={false} />);
    for (const c of dream.categories) {
      expect(screen.queryByText(c)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/rendu illustratif/i)).toBeInTheDocument();
    expect(screen.getByText(dream.report_reconstructed)).toBeInTheDocument();
    expect(screen.getByText(/Reconstitué à partir des catégories/i)).toBeInTheDocument();
  });

  it("bascule sur le repli visuel si l'image échoue à charger, tout en gardant le badge d'honnêteté", () => {
    render(<DreamPlate dream={dream} />);
    const img = screen.getByAltText(/rendu illustratif/i);
    fireEvent.error(img);
    expect(screen.getByLabelText(/rendu illustratif/i)).toHaveClass("dream-fallback");
    expect(screen.getByText(/rendu illustratif/i)).toBeInTheDocument();
  });
});
