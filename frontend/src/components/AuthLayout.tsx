import type { ReactNode } from "react";
import { BrandVisual } from "./BrandVisual";
import { Icon } from "./Icon";
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow light">
          FORMACIÓN Y DESARROLLO PROFESIONAL
        </span>
        <h2>
          Fortalece tu
          <br />
          práctica
          <br />
          <em>profesional.</em>
        </h2>
        <p>
          Aprende a tu ritmo y en tus horarios.
          <br />
          Cursos y talleres para seguir preparándote.
        </p>
        <BrandVisual compact />
        <div className="story-footer">
          <Icon name="book" />
          <span>Conocimiento para tu siguiente etapa.</span>
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
