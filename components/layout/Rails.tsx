/**
 * Server component — pure markup. The progress fill + section counter
 * are updated imperatively by the Scene client component as the user
 * scrolls (it queries `.progress-fill` and `.counter`).
 */
export default function Rails() {
  return (
    <>
      <div className="rail-l">
        <span className="v">PARBAT / LAMA / 2026</span>
        <span className="counter">00 / 06</span>
      </div>
      <div className="rail-r">
        <span className="v">LALITPUR · NP · UTC+5:45</span>
        <div className="progress-track">
          <div className="progress-fill" />
        </div>
        <span className="v">SCROLL · ↓</span>
      </div>
    </>
  );
}
