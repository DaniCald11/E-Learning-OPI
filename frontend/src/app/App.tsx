import {
  Link as RouterLink,
  NavLink,
  Route,
  Routes,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
} from "@mui/material";
import { lazy, Suspense, useState } from "react";
import { useSession, sessionKey } from "../features/auth/session";
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
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { clearEditorDrafts } from "../features/catalog/useEditorDraft";
export default function App() {
  const { data } = useSession();
  const query = useQueryClient();
  const navigate = useNavigate();
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [error, setError] = useState("");
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Ir al contenido
      </a>
      <header className="site-header">
        <RouterLink to="/" className="brand">
          <span className="brand-symbol">
            <Icon name="building" size={24} />
          </span>
          <span>
            OPI<span className="brand-sub">E—LEARNING</span>
          </span>
        </RouterLink>
        <nav aria-label="Navegación principal">
          <Button component={NavLink} to="/" end>
            Inicio
          </Button>
          <Button component={NavLink} to="/catalogo">
            Catálogo
          </Button>
          {data ? (
            <>
              {data.roles.includes("Admin") && (
                <Button component={NavLink} to="/admin">
                  Panel administrativo
                </Button>
              )}
              <Button
                id="account-menu-button"
                aria-label="Mi cuenta"
                aria-haspopup="menu"
                aria-controls={accountAnchor ? "account-menu" : undefined}
                aria-expanded={Boolean(accountAnchor)}
                onClick={(event) => setAccountAnchor(event.currentTarget)}
                startIcon={
                  <Avatar
                    src={data.avatarUrl ?? undefined}
                    alt=""
                    sx={{ width: 26, height: 26, fontSize: 12 }}
                  >
                    {data.fullName.slice(0, 1)}
                  </Avatar>
                }
              >
                Mi cuenta
              </Button>
              <Menu
                id="account-menu"
                anchorEl={accountAnchor}
                open={Boolean(accountAnchor)}
                onClose={() => setAccountAnchor(null)}
                slotProps={{
                  list: { "aria-labelledby": "account-menu-button" },
                }}
              >
                <MenuItem
                  component={RouterLink}
                  to="/mi-cuenta"
                  onClick={() => setAccountAnchor(null)}
                >
                  Mi perfil
                </MenuItem>
                <MenuItem
                  onClick={async () => {
                    try {
                      await mutate("/auth/logout");
                      clearEditorDrafts();
                      query.clear();
                      query.setQueryData(sessionKey, null);
                      setAccountAnchor(null);
                      navigate("/login");
                      setError("");
                    } catch (failure) {
                      setError(errorMessage(failure));
                    }
                  }}
                >
                  Cerrar sesión
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={RouterLink} to="/login" className="login-nav">
                Iniciar sesión
              </Button>
              <Button component={RouterLink} to="/registro" variant="contained">
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
                  <Navigate to="/mi-cuenta" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="Admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-cuenta"
              element={
                <ProtectedRoute>
                  <ProfilePage />
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
