import type { Item } from "./manifest";

export type Rng = () => number;
export interface Round {
  targetId: string;
  optionIds: string[];
}

export function eligibleItems(items: Item[]): Item[] {
  return items.filter((it) => it.gt.displayable && it.gt.path !== null);
}

function pickIndex(n: number, rng: Rng): number {
  return Math.min(n - 1, Math.floor(rng() * n));
}

export function buildRound(items: Item[], optionCount: number, rng: Rng): Round {
  const pool = eligibleItems(items);
  if (pool.length < optionCount) {
    throw new Error(`Pas assez d'images affichables pour une manche (${pool.length} < ${optionCount})`);
  }
  const remaining = [...pool];
  const chosen: Item[] = [];
  while (chosen.length < optionCount) {
    const idx = pickIndex(remaining.length, rng);
    chosen.push(remaining.splice(idx, 1)[0]);
  }
  const target = chosen[pickIndex(chosen.length, rng)];
  return { targetId: target.id, optionIds: chosen.map((c) => c.id) };
}

export function isCorrect(round: Round, chosenId: string): boolean {
  return round.targetId === chosenId;
}
