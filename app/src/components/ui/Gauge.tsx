import { formatMetric, gaugeColorVar } from "../../lib/metrics";

export function Gauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="gauge" title={`${label} : ${formatMetric(value)}`}>
      <span className="ui-label">{label}</span>
      <span className="gauge-track" aria-hidden>
        <span className="gauge-fill" style={{ width: `${pct}%`, background: gaugeColorVar(value) }} />
      </span>
      <span>{formatMetric(value)}</span>
    </div>
  );
}
