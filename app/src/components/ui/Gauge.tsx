import { motion, useReducedMotion } from "framer-motion";
import { formatMetric, gaugeColorVar } from "../../lib/metrics";

export function Gauge({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="gauge" title={`${label} : ${formatMetric(value)}`}>
      <span className="gauge-track" aria-hidden="true">
        <motion.span
          className="gauge-fill"
          style={{ background: gaugeColorVar(value) }}
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </span>
      <span className="gauge-val tabular">{formatMetric(value)}</span>
    </div>
  );
}
