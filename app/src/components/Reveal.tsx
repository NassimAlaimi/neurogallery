import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** Apparition douce au scroll (fade + montée), désactivée si reduced-motion. */
export function Reveal({
  children, delay = 0, y = 26, className,
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
