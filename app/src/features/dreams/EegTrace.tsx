/** Clean EEG monitor line: a seamless repeating trace that scrolls when `active`.
 *  Two identical 80-unit periods (viewBox 0..160) so translateX(-50%) loops without a seam. */
export function EegTrace({ active }: { active: boolean }) {
  const points =
    "0,20 10,20 14,16 18,24 24,20 34,20 38,8 42,32 46,20 56,20 60,17 64,23 72,20 80,20 " +
    "80,20 90,20 94,16 98,24 104,20 114,20 118,8 122,32 126,20 136,20 140,17 144,23 152,20 160,20";
  return (
    <svg
      className={`eeg${active ? " eeg-active" : ""}`}
      viewBox="0 0 160 40"
      preserveAspectRatio="none"
      role="img"
      aria-label="EEG trace"
    >
      <polyline className="eeg-path" points={points} />
    </svg>
  );
}
