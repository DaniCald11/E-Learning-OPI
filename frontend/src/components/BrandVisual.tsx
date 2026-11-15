import { Icon } from "./Icon";
export function BrandVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand-visual ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      <div className="orbital orbital-one" />
      <div className="orbital orbital-two" />
      <div className="orbital orbital-three" />
      <div className="visual-center">
        <Icon name="spark" size={74} />
      </div>
      <div className="floating-note note-top">
        <span className="note-icon">
          <Icon name="book" />
        </span>
        <span>
          Una nueva perspectiva.<small>Todo empieza con aprender.</small>
        </span>
      </div>
      <div className="floating-note note-bottom">
        <span className="note-icon">
          <Icon name="check" />
        </span>
        <span>
          A tu ritmo.<small>Un paso a la vez.</small>
        </span>
      </div>
      <span className="orbit-dot dot-one" />
      <span className="orbit-dot dot-two" />
    </div>
  );
}
