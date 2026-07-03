/** Fond fixe animé : trois halos (violet/magenta/cyan) qui dérivent + grain. */
export function NeuralBackdrop() {
  return (
    <div className="neural-bg" aria-hidden="true">
      <span />
      <div className="grain" />
    </div>
  );
}
