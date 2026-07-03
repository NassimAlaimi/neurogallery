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
    { id: "dream-01", featured: true, categories: ["person", "street"], report_reconstructed: "A street.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg" },
    { id: "dream-02", featured: false, categories: ["room", "book"], report_reconstructed: "A room.", render: "renders/dream-02.webp", thumb: "thumbs/dream-02.jpg" },
    { id: "dream-03", featured: false, categories: ["car"], report_reconstructed: "A car.", render: "renders/dream-03.webp", thumb: "thumbs/dream-03.jpg" },
  ],
  study_metrics: { pairwise_accuracy_pct: 60, note: "study measure" },
  sources: [{ label: "Horikawa 2013", url: "https://example.org" }],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => dreams }) as unknown as Response));
});

describe("DreamsPage", () => {
  it("loads and renders the key sections", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // real study facts ("9 s" shows in the protocol step; getAllByText tolerates repeats)
    expect(screen.getAllByText(/9\s*s/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Horikawa/i).length).toBeGreaterThan(0);
  });

  it("contains the honesty block 'what it does / doesn't do'", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("What it does")).toBeInTheDocument());
    expect(screen.getByText("What it doesn't do")).toBeInTheDocument();
    // the honest line appears both in the "doesn't do" block and the Awakening
    // truth card (mounted, CSS-gated): getAllByText, without weakening the guard.
    expect(screen.getAllByText(/not a seen image/i).length).toBeGreaterThan(0);
  });

  it("lists the clickable sources", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("link", { name: /Horikawa 2013/i })).toBeInTheDocument());
  });

  it("explains the pipeline on the page, with the real/render distinction", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: /How it works/i })).toBeInTheDocument());
    // the chain is spelled out here + the real decoding is distinguished from our render
    // (exact connector labels: prose "the decoder…" would also match /Decoder/i)
    expect(screen.getByText(/Decoder · real/i)).toBeInTheDocument();
    expect(screen.getByText(/Diffusion · our render/i)).toBeInTheDocument();
    expect(screen.getAllByText(/illustrative render/i).length).toBeGreaterThan(0);
  });
});
