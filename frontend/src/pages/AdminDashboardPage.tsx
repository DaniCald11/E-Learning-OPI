import { Link as RouterLink } from "react-router-dom";
import { Icon } from "../components/Icon";
export function AdminDashboardPage() {
  const steps = [
    {
      to: "/admin/biblioteca",
      icon: "folder" as const,
      title: "Biblioteca",
      text: "Carga y organiza videos, documentos y portadas en carpetas.",
    },
    {
      to: "/admin/cursos",
      icon: "book" as const,
      title: "Cursos",
      text: "Prepara temas, módulos, lecciones y cuestionarios con tus materiales.",
    },
    {
      to: "/admin/formaciones",
      icon: "building" as const,
      title: "Formaciones y talleres",
      text: "Selecciona cursos, define el precio y publica tu oferta en el catálogo.",
    },
  ];
  return (
    <section className="admin-page">
      <div className="account-heading">
        <span className="eyebrow">GESTIÓN DE TU PLATAFORMA</span>
        <h1>Panel administrativo</h1>
        <p>
          Prepara tus materiales, organiza el contenido y publica tus
          formaciones.
        </p>
      </div>
      <div className="admin-workflow">
        {steps.map((step, i) => (
          <RouterLink to={step.to} className="workflow-card" key={step.to}>
            <span className="workflow-number">0{i + 1}</span>
            <Icon name={step.icon} size={34} />
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            <span className="workflow-action">
              Abrir {step.title.toLowerCase()} <Icon />
            </span>
          </RouterLink>
        ))}
      </div>
      <p className="auth-description">
        Este orden te orienta: puedes volver a la Biblioteca cuando lo necesites
        sin perder el borrador del curso.
      </p>
    </section>
  );
}
