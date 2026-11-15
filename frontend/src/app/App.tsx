import {
  Link as RouterLink,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, CircularProgress } from "@mui/material";
import { lazy, Suspense, useState } from "react";
import { useSession, sessionKey, landing } from "../features/auth/session";
import { mutate, errorMessage } from "../services/api";
import { ProtectedRoute } from "./ProtectedRoute";
import { HomePage } from "../pages/HomePage";
const LoginPage = lazy(() =>
  import("../pages/AuthPages").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("../pages/AuthPages").then((m) => ({ default: m.RegisterPage })),
);
const ConfirmPage = lazy(() =>
  import("../pages/AuthPages").then((m) => ({ default: m.ConfirmPage })),
);
const ForgotPage = lazy(() =>
  import("../pages/AuthPages").then((m) => ({ default: m.ForgotPage })),
);
const ResetPage = lazy(() =>
  import("../pages/AuthPages").then((m) => ({ default: m.ResetPage })),
);
const ProfilePage = lazy(() =>
  import("../pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const CatalogPage = lazy(() =>
  import("../pages/CatalogPages").then((m) => ({ default: m.CatalogPage })),
);
const ProductDetailPage = lazy(() =>
  import("../pages/CatalogPages").then((m) => ({
    default: m.ProductDetailPage,
  })),
);
const AdminProductsPage = lazy(() =>
  import("../pages/AdminCatalogPages").then((m) => ({
    default: m.AdminProductsPage,
  })),
);
const AdminCoursesPage = lazy(() =>
  import("../pages/AdminCatalogPages").then((m) => ({
    default: m.AdminCoursesPage,
  })),
);
const MediaLibraryPage = lazy(() =>
  import("../pages/AdminCatalogPages").then((m) => ({
    default: m.MediaLibraryPage,
  })),
);
const CourseEditorPage = lazy(() =>
  import("../pages/CourseEditorPage").then((m) => ({
    default: m.CourseEditorPage,
  })),
);
const ProductEditorPage = lazy(() =>
  import("../pages/ProductEditorPage").then((m) => ({
    default: m.ProductEditorPage,
  })),
);
import { AuthLayout } from "../components/AuthLayout";
import { Icon } from "../components/Icon";
function Dashboard({ admin = false }: { admin?: boolean }) {
  const { data } = useSession();
  return (
    <section className="account-page">
      <div className="account-heading">
        <span className="eyebrow">
          {admin ? "TU ESPACIO DE GESTIÓN" : "TU ESPACIO PERSONAL"}
        </span>
        <h1>{admin ? "Administración" : "Mi cuenta"}</h1>
        <p>Hola, {data?.fullName}. Qué bueno tenerte aquí.</p>
        {admin && (
          <div className="button-row">
            <Button
              component={RouterLink}
              to="/admin/formaciones"
              variant="contained"
            >
              Gestionar formaciones
            </Button>
            <Button component={RouterLink} to="/admin/cursos">
              Cursos
            </Button>
            <Button component={RouterLink} to="/admin/biblioteca">
              Biblioteca
            </Button>
          </div>
        )}
      </div>
      <div className="account-grid">
        <article className="account-card dark-card">
          <Icon name="spark" size={36} />
          <h2>
            Todo empieza
            <br />
            contigo.
          </h2>
          <p>Haz de tu cuenta un espacio propio.</p>
          <Button
            component={RouterLink}
            to="/perfil"
            variant="contained"
            endIcon={<Icon />}
          >
            Editar mi perfil
          </Button>
        </article>
        <article className="account-card">
          <span className="eyebrow">PERFIL Y ACCESO</span>
          <div className="account-avatar">
            {data?.fullName.slice(0, 1).toUpperCase()}
          </div>
          <h2>{data?.fullName}</h2>
          <p>{data?.email}</p>
          <span className="status-chip">
            <Icon name="check" size={15} /> Correo confirmado
          </span>
        </article>
      </div>
    </section>
  );
}
export default function App() {
  const { data } = useSession();
  const query = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <header className="site-header">
        <RouterLink to="/" className="brand">
          <span className="brand-symbol">
            <Icon name="spark" size={24} />
          </span>
          <span>
            OPI<span className="brand-sub">E—LEARNING</span>
          </span>
        </RouterLink>
        <nav aria-label="Navegación principal">
          <Button component={RouterLink} to="/catalogo">
            Catálogo
          </Button>
          <NavLink to="/" end className="nav-home">
            Inicio
          </NavLink>
          {data ? (
            <>
              <Button component={RouterLink} to={landing(data)}>
                Mi cuenta
              </Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    await mutate("/auth/logout");
                    query.setQueryData(sessionKey, null);
                    navigate("/login");
                    setError("");
                  } catch (failure) {
                    setError(errorMessage(failure));
                  }
                }}
              >
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/login" className="login-nav">
                Iniciar sesión
              </Button>
              <Button
                component={RouterLink}
                to="/registro"
                variant="contained"
                endIcon={<Icon name="diagonal" size={17} />}
              >
                Crear cuenta
              </Button>
            </>
          )}
        </nav>
      </header>
      <main id="main-content">
        {error && <Alert severity="error">{error}</Alert>}
        <Suspense
          fallback={
            <div className="account-page">
              <CircularProgress aria-label="Cargando página" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalogo" element={<CatalogPage />} />
            <Route path="/formacion/:slug" element={<ProductDetailPage />} />
            <Route
              path="/admin/formaciones"
              element={
                <ProtectedRoute role="Admin">
                  <AdminProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/formaciones/nueva"
              element={
                <ProtectedRoute role="Admin">
                  <ProductEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/formaciones/:id/editar"
              element={
                <ProtectedRoute role="Admin">
                  <ProductEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cursos"
              element={
                <ProtectedRoute role="Admin">
                  <AdminCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cursos/nuevo"
              element={
                <ProtectedRoute role="Admin">
                  <CourseEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cursos/:id/editar"
              element={
                <ProtectedRoute role="Admin">
                  <CourseEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/biblioteca"
              element={
                <ProtectedRoute role="Admin">
                  <MediaLibraryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/login"
              element={
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              }
            />
            <Route
              path="/registro"
              element={
                <AuthLayout>
                  <RegisterPage />
                </AuthLayout>
              }
            />
            <Route
              path="/recuperar-contrasena"
              element={
                <AuthLayout>
                  <ForgotPage />
                </AuthLayout>
              }
            />
            <Route
              path="/restablecer-contrasena"
              element={
                <AuthLayout>
                  <ResetPage />
                </AuthLayout>
              }
            />
            <Route
              path="/confirmar-correo"
              element={
                <AuthLayout>
                  <ConfirmPage />
                </AuthLayout>
              }
            />
            <Route
              path="/alumno/dashboard"
              element={
                <ProtectedRoute role="Student">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="Admin">
                  <Dashboard admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <section className="account-page">
                  <h1>Página no encontrada</h1>
                  <Button component={RouterLink} to="/">
                    Volver al inicio
                  </Button>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="site-footer">
        <RouterLink to="/" className="footer-brand">
          OPI <span>El siguiente paso es tuyo.</span>
        </RouterLink>
        <span>
          HECHO PARA SEGUIR APRENDIENDO <Icon name="diagonal" size={16} />
        </span>
      </footer>
    </div>
  );
}
