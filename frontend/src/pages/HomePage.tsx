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
            <span className="live-dot" /> TU SIGUIENTE PASO EMPIEZA AQUÍ
          </span>
          <h1>
            Aprende algo.
            <br />
            Cambia <span>todo.</span>
            <span className="headline-star">✳</span>
          </h1>
          <p>
            El conocimiento abre caminos. Haz espacio para nuevas ideas,
            fortalece tus habilidades y construye lo que sigue.
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
            UNA MENTE ABIERTA.
            <br />
            UN MUNDO DE POSIBILIDADES.
          </span>
          <BrandVisual />
          <span className="art-bottom">
            E–LEARNING OPI <span>EST. EN TU CURIOSIDAD ↗</span>
          </span>
        </div>
      </section>
      <section className="learning-strip">
        <span>Una idea puede ser el comienzo.</span>
        <div>
          Explora <Icon name="spark" /> Aprende <Icon name="spark" /> Evoluciona{" "}
          <Icon name="spark" />
        </div>
      </section>
      <section className="home-bottom">
        <div>
          <span className="eyebrow">CRECER SE CONSTRUYE</span>
          <h2>
            Un espacio para
            <br />
            tu siguiente paso.
          </h2>
        </div>
        <div className="value-card">
          <span>01 / TU CUENTA</span>
          <Icon name="user" size={28} />
          <h3>Tu punto de partida.</h3>
          <p>Un perfil propio para acompañar tu camino de aprendizaje.</p>
        </div>
        <div className="value-card">
          <span>02 / TU SEGURIDAD</span>
          <Icon name="shield" size={28} />
          <h3>Empieza con confianza.</h3>
          <p>Confirma tu correo y mantén el control de tu cuenta.</p>
        </div>
      </section>
    </>
  );
}
