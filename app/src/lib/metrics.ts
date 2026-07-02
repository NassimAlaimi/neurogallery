const HIGH = 0.6;
const MID = 0.35;

export function formatMetric(value: number): string {
  return value.toFixed(2);
}

export function gaugeLevel(value: number): "high" | "mid" | "low" {
  if (value >= HIGH) return "high";
  if (value >= MID) return "mid";
  return "low";
}

export function gaugeColorVar(value: number): string {
  const level = gaugeLevel(value);
  if (level === "high") return "var(--color-high)";
  if (level === "low") return "var(--color-low)";
  return "color-mix(in oklch, var(--color-high), var(--color-low))";
}
