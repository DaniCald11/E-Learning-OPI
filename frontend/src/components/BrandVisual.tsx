export function BrandVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        "brand-visual professional-visual " + (compact ? "compact" : "")
      }
      aria-hidden="true"
    >
      <div className="plan-grid" />
      <svg className="building-plan" viewBox="0 0 360 300" fill="none">
        <g stroke="currentColor" strokeWidth="1.25">
          <path
            className="plan-outline"
            d="M35 251h290M70 251V97l102-49 102 49v154M172 48v203M274 130l40 19v102M93 108l55-26v144H93zM194 83l55 27v116h-55zM93 144h55m-55 40h55m46-39h55m-55 40h55M113 99v127m103-132v132M286 161v65m15-58v58M58 263h268"
          />
          <path
            opacity=".35"
            strokeDasharray="3 5"
            d="M35 45h290M35 275h290M49 31v255M327 31v255"
          />
          <path
            opacity=".65"
            d="m43 49 12-8m-12 238 12-8m272-222 12-8m-12 238 12-8"
          />
        </g>
      </svg>
      <div className="plan-caption">
        <span>DESARROLLO PROFESIONAL</span>
        <strong>
          Conocimiento aplicado.
          <br />
          Criterio para avanzar.
        </strong>
      </div>
      <div className="plan-detail">
        <span>FORMACIÓN INMOBILIARIA</span>
        <span>A TU RITMO</span>
      </div>
    </div>
  );
}
