import { describe, it, expect } from "vitest";
import { formatMetric, gaugeLevel, gaugeColorVar } from "./metrics";

describe("metrics", () => {
  it("formats to 2 decimals", () => {
    expect(formatMetric(0.12345)).toBe("0.12");
    expect(formatMetric(1)).toBe("1.00");
  });
  it("classifies gauge levels by threshold", () => {
    expect(gaugeLevel(0.8)).toBe("high");
    expect(gaugeLevel(0.4)).toBe("mid");
    expect(gaugeLevel(0.1)).toBe("low");
  });
  it("classifies exact threshold boundaries correctly", () => {
    expect(gaugeLevel(0.6)).toBe("high");
    expect(gaugeLevel(0.35)).toBe("mid");
  });
  it("returns correct color variables for gauge levels", () => {
    expect(gaugeColorVar(0.8)).toContain("--color-high");
    expect(gaugeColorVar(0.1)).toContain("--color-low");
    expect(gaugeColorVar(0.4)).toContain("color-mix");
  });
});
