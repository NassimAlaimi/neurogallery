import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DreamPlate } from "./DreamPlate";
import type { DreamExample } from "../../lib/dreams";

const dream: DreamExample = {
  id: "dream-01",
  featured: true,
  categories: ["person", "street", "building"],
  report_reconstructed: "A street lined with buildings.",
  render: "renders/dream-01.webp",
  thumb: "thumbs/dream-01.jpg",
};

describe("DreamPlate", () => {
  it("shows the real categories", () => {
    render(<DreamPlate dream={dream} />);
    for (const c of dream.categories ?? []) {
      expect(screen.getByText(c)).toBeInTheDocument();
    }
  });

  it("shows the reconstructed report with its label", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(dream.report_reconstructed)).toBeInTheDocument();
    expect(screen.getByText(/Reconstructed from the decoded categories/i)).toBeInTheDocument();
  });

  it("labels the image as an illustrative render (honesty)", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(/illustrative render/i)).toBeInTheDocument();
    // the image alt also carries the mention
    expect(screen.getByAltText(/illustrative render/i)).toBeInTheDocument();
  });

  it("never presents the image as 'seen' or a 'real dream'", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.queryByText(/seen image/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/real dream/i)).not.toBeInTheDocument();
  });

  it("hides the category chips when showCategories=false, but keeps badge and report", () => {
    render(<DreamPlate dream={dream} showCategories={false} />);
    for (const c of dream.categories ?? []) {
      expect(screen.queryByText(c)).not.toBeInTheDocument();
    }
    expect(screen.getByText(/illustrative render/i)).toBeInTheDocument();
    expect(screen.getByText(dream.report_reconstructed)).toBeInTheDocument();
    expect(screen.getByText(/Reconstructed from the decoded categories/i)).toBeInTheDocument();
  });

  it("falls back to the gradient tile if the image fails to load, keeping the honesty badge", () => {
    render(<DreamPlate dream={dream} />);
    const img = screen.getByAltText(/illustrative render/i);
    fireEvent.error(img);
    expect(screen.getByLabelText(/illustrative render/i)).toHaveClass("dream-fallback");
    expect(screen.getByText(/illustrative render/i)).toBeInTheDocument();
  });

  it("shows reported vs decoded when the example is decoded", () => {
    const dec = { ...dream, reported: ["person", "street"], decoded: ["person", "car"], categories: undefined };
    render(<DreamPlate dream={dec} />);
    expect(screen.getByText(/Reported \(dataset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoded \(our reproduction\)/i)).toBeInTheDocument();
  });
});
