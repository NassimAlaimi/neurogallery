/** Tracé EEG stylisé. Animation CSS (translation) quand `active`, sinon statique. */
export function EegTrace({ active }: { active: boolean }) {
  // Deux périodes identiques pour un défilement sans couture.
  const wave =
    "M0 20 L10 20 L14 8 L18 32 L22 20 L34 20 L38 14 L42 26 L46 20 L60 20" +
    " L70 20 L74 8 L78 32 L82 20 L94 20 L98 14 L102 26 L106 20 L120 20";
  return (
    <svg
      className={`eeg${active ? " eeg-active" : ""}`}
      viewBox="0 0 60 40"
      preserveAspectRatio="none"
      role="img"
      aria-label="Tracé EEG"
    >
      <path d={wave} className="eeg-path" />
    </svg>
  );
}
