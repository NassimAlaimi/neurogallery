import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryCompare } from "./CategoryCompare";

describe("CategoryCompare", () => {
  it("shows reported and decoded rows with honest labels", () => {
    render(<CategoryCompare reported={["person", "street"]} decoded={["person", "car"]} />);
    expect(screen.getByText(/Reported \(dataset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoded \(our reproduction\)/i)).toBeInTheDocument();
    // overlapping category "person" appears in both rows
    expect(screen.getAllByText("person").length).toBe(2);
    expect(screen.getByText("street")).toBeInTheDocument();
    expect(screen.getByText("car")).toBeInTheDocument();
  });

  it("marks matched chips with the match class", () => {
    const { container } = render(<CategoryCompare reported={["person"]} decoded={["person", "car"]} />);
    const matched = container.querySelectorAll(".cat-chip.match");
    expect(matched.length).toBe(2); // 'person' in both rows
  });
});
