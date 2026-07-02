import { describe, it, expect } from "vitest";
import { assetUrl } from "./artifact";

describe("assetUrl", () => {
  it("joins base and relative path with a single slash", () => {
    expect(assetUrl("/base", "recon/0001.png")).toBe("/base/recon/0001.png");
    expect(assetUrl("/base/", "recon/0001.png")).toBe("/base/recon/0001.png");
  });
});
