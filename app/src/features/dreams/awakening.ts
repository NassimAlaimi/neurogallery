export type AwakeningPhase =
  | "sleeping"
  | "onset"
  | "awake"
  | "decoding"
  | "forming"
  | "truth";

export const AWAKENING_PHASES: readonly AwakeningPhase[] = [
  "sleeping", "onset", "awake", "decoding", "forming", "truth",
] as const;

export function phaseIndex(p: AwakeningPhase): number {
  return AWAKENING_PHASES.indexOf(p);
}

export function nextPhase(p: AwakeningPhase): AwakeningPhase {
  const i = phaseIndex(p);
  return AWAKENING_PHASES[Math.min(i + 1, AWAKENING_PHASES.length - 1)];
}

/** current a-t-il atteint (ou dépassé) target ? */
export function atLeast(current: AwakeningPhase, target: AwakeningPhase): boolean {
  return phaseIndex(current) >= phaseIndex(target);
}
