import { describe, it, expect } from "vitest";
import { AWAKENING_PHASES, nextPhase, phaseIndex, atLeast } from "./awakening";

describe("awakening state machine", () => {
  it("progresse dans l'ordre attendu", () => {
    expect(AWAKENING_PHASES).toEqual(["sleeping", "onset", "awake", "decoding", "forming", "truth"]);
  });

  it("nextPhase avance d'un cran", () => {
    expect(nextPhase("sleeping")).toBe("onset");
    expect(nextPhase("decoding")).toBe("forming");
  });

  it("nextPhase reste à truth en fin de séquence", () => {
    expect(nextPhase("truth")).toBe("truth");
  });

  it("atLeast compare la progression", () => {
    expect(atLeast("forming", "decoding")).toBe(true);
    expect(atLeast("onset", "decoding")).toBe(false);
    expect(atLeast("truth", "truth")).toBe(true);
  });

  it("phaseIndex donne la position", () => {
    expect(phaseIndex("sleeping")).toBe(0);
    expect(phaseIndex("truth")).toBe(5);
  });
});
