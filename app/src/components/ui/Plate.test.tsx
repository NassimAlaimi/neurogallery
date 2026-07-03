import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plate } from "./Plate";
import type { Item } from "../../lib/manifest";

const BASE = "/x";
const METHOD = "brain-diffuser";

function makeItem(gt: Item["gt"]): Item {
  return {
    id: "img-1",
    coco_id: 1,
    category: "animal",
    recon: { [METHOD]: "recon/img-1.jpg" },
    thumb: "thumb/img-1.jpg",
    gt,
    metrics: { [METHOD]: { clip: 0.5 } },
  };
}

describe("Plate legal GT-gating", () => {
  it("shows the seen image when gt.displayable is true and gt.path is set", () => {
    const item = makeItem({ displayable: true, path: "gt/x.jpg", license_name: "CC-BY" });
    render(<Plate item={item} method={METHOD} base={BASE} />);

    expect(screen.getByAltText(/Seen image/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Reconstruction/i)).toBeInTheDocument();
  });

  it("masks the seen image when gt.displayable is false and gt.path is null", () => {
    const item = makeItem({ displayable: false, path: null, license_name: "Restrictive" });
    render(<Plate item={item} method={METHOD} base={BASE} />);

    expect(screen.queryByAltText(/Seen image/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Source hidden/i) ?? screen.getByLabelText(/Source hidden/i),
    ).toBeInTheDocument();
    expect(screen.getByAltText(/Reconstruction/i)).toBeInTheDocument();
  });

  it("shows the brain-activity input panel when item.input is present", () => {
    const item = { ...makeItem({ displayable: true, path: "gt/x.jpg", license_name: "CC-BY" }), input: "input/img-1.png" };
    render(<Plate item={item} method={METHOD} base={BASE} />);
    expect(screen.getByAltText(/Brain activity/i)).toBeInTheDocument();
  });

  it("omits the input panel when item.input is absent", () => {
    const item = makeItem({ displayable: true, path: "gt/x.jpg", license_name: "CC-BY" });
    render(<Plate item={item} method={METHOD} base={BASE} />);
    expect(screen.queryByAltText(/Brain activity/i)).not.toBeInTheDocument();
  });
});
