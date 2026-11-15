import type { ReactNode } from "react";
import { BrandVisual } from "./BrandVisual";
import { Icon } from "./Icon";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow light">EL CONOCIMIENTO TE MUEVE</span>
        <h2>
          Tu próxima
          <br />
          versión empieza
          <br />
          <em>aquí.</em>
        </h2>
        <p>
          Nuevas ideas. Más posibilidades.
          <br />
          Un espacio para seguir creciendo.
        </p>
        <BrandVisual compact />
        <div className="story-footer">
          <Icon name="spark" />
          <span>Pequeños pasos. Nuevas posibilidades.</span>
        </div>
      </aside>
      <div className="auth-content">
        <div className="auth-form-wrap">{children}</div>
        <p className="secure-footnote">
          <Icon name="lock" size={14} /> Tu cuenta, en un espacio seguro.
        </p>
      </div>
    </section>
  );
}
