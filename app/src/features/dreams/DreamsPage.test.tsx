import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DreamsPage from "./DreamsPage";
import type { Dreams } from "../../lib/dreams";

const dreams: Dreams = {
  study: {
    title: "Neural Decoding of Visual Imagery During Sleep",
    authors: "Horikawa, Tamaki, Miyawaki, Kamitani",
    venue: "Science", year: 2013, subjects: 3, awakenings_per_subject: "~200",
    window_seconds: 9, window_volumes: 3, source_url: "https://example.org",
  },
  examples: [
    { id: "dream-01", featured: true, categories: ["personne", "rue"], report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg" },
    { id: "dream-02", featured: false, categories: ["pièce", "livre"], report_reconstructed: "Une pièce.", render: "renders/dream-02.webp", thumb: "thumbs/dream-02.jpg" },
    { id: "dream-03", featured: false, categories: ["voiture"], report_reconstructed: "Une voiture.", render: "renders/dream-03.webp", thumb: "thumbs/dream-03.jpg" },
  ],
  study_metrics: { pairwise_accuracy_pct: 60, note: "mesure d'étude" },
  sources: [{ label: "Horikawa 2013", url: "https://example.org" }],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => dreams }) as unknown as Response));
});

describe("DreamsPage", () => {
  it("charge et rend les sections clés", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // faits réels d'étude (le "9 s" apparaît à la fois dans le titre et la
    // description de l'étape 04 : redondance honnête intentionnelle, donc
    // getAllByText plutôt que getByText — même idiome que la ligne suivante).
    expect(screen.getAllByText(/9\s*s/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Horikawa/i).length).toBeGreaterThan(0);
  });

  it("contient le bloc d'honnêteté 'ce que ça fait / ne fait pas'", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ce que ça fait/i)).toBeInTheDocument());
    expect(screen.getByText(/Ce que ça ne fait pas/i)).toBeInTheDocument();
    // Le message honnête apparaît à la fois dans le bloc "ce que ça ne fait
    // pas" et dans la carte de vérité toujours montée d'<Awakening> (visible
    // seulement en CSS une fois la phase atteinte) : getAllByText plutôt que
    // getByText, sans affaiblir l'assertion d'honnêteté.
    expect(screen.getAllByText(/pas une image vue/i).length).toBeGreaterThan(0);
  });

  it("liste les sources cliquables", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("link", { name: /Horikawa 2013/i })).toBeInTheDocument());
  });

  it("explique la pipeline sur la page, avec la distinction réel/rendu", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Comment ça marche/i })).toBeInTheDocument());
    // la chaîne est explicitée ici + le décodage réel est distingué de notre rendu
    // (libellés exacts des connecteurs : "le décodeur…" dans le texte matcherait /Décodeur/i)
    expect(screen.getByText(/Décodeur · réel/i)).toBeInTheDocument();
    expect(screen.getByText(/Diffusion · notre rendu/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rendu illustratif/i).length).toBeGreaterThan(0);
  });
});
