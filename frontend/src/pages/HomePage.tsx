import { Link as RouterLink } from "react-router-dom";
import { Button } from "@mui/material";
import { useSession } from "../features/auth/session";
import { BrandVisual } from "../components/BrandVisual";
import { Icon } from "../components/Icon";
export function HomePage() {
  const { data } = useSession();
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> FORMACIÓN PARA EL SECTOR INMOBILIARIO
          </span>
          <h1>
            Impulsa tu
            <br />
            carrera <span>inmobiliaria.</span>
          </h1>
          <p>
            Fortalece tus habilidades con cursos y talleres de
            profesionalización para el sector inmobiliario. Aprende a tu ritmo,
            en los horarios que mejor se adapten a ti.
          </p>
          <div className="hero-actions">
            <Button
              component={RouterLink}
              to="/catalogo"
              variant="contained"
              endIcon={<Icon />}
            >
              Explorar formaciones
            </Button>
            {!data && (
              <Button
                component={RouterLink}
                to="/login"
                endIcon={<Icon name="diagonal" />}
              >
                Ya tengo cuenta
              </Button>
            )}
          </div>
          <div className="hero-caption">
            <span className="caption-line" />
            <span>APRENDER ES UNA FORMA DE AVANZAR.</span>
          </div>
        </div>
        <div className="hero-art">
          <span className="art-label">
            ACTUALIZACIÓN PROFESIONAL.
            <br />
            APRENDIZAJE CON PROPÓSITO.
          </span>
          <BrandVisual />
          <span className="art-bottom">
            E–LEARNING OPI <span>APRENDE · APLICA · AVANZA</span>
          </span>
        </div>
      </section>
      <section className="learning-strip">
        <span>Conocimiento para tu práctica profesional.</span>
        <div>
          Aprende <Icon name="book" /> Especialízate <Icon name="book" /> Avanza{" "}
          <Icon name="book" />
        </div>
      </section>
      <section className="home-bottom">
        <div>
          <span className="eyebrow">FORMACIÓN QUE SE ADAPTA A TI</span>
          <h2>
            Actualiza tus habilidades.
            <br />
            Organiza tu aprendizaje.
          </h2>
        </div>
        <div className="value-card">
          <span>01 / APRENDIZAJE FLEXIBLE</span>
          <Icon name="user" size={28} />
          <h3>A tu ritmo y en tus horarios.</h3>
          <p>Organiza tu tiempo y avanza en tu formación profesional.</p>
        </div>
        <div className="value-card">
          <span>02 / DESARROLLO PROFESIONAL</span>
          <Icon name="shield" size={28} />
          <h3>Conocimiento con enfoque.</h3>
          <p>
            Explora cursos y talleres orientados a fortalecer tu práctica
            inmobiliaria.
          </p>
        </div>
      </section>
      <section className="home-invitation">
        <div>
          <span className="eyebrow">SIGUE CONSTRUYENDO TU EXPERIENCIA</span>
          <h2>
            El siguiente paso en tu carrera
            <br />
            empieza con lo que aprendes hoy.
          </h2>
          <p>
            Encuentra una formación que se adapte a tus objetivos y a tus
            horarios.
          </p>
        </div>
        <Button
          component={RouterLink}
          to="/catalogo"
          variant="contained"
          endIcon={<Icon />}
        >
          Ver catálogo
        </Button>
      </section>
    </>
  );
}
