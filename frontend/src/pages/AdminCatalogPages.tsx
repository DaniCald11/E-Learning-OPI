import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { api, errorMessage, mutate } from "../services/api";
import { Icon } from "../components/Icon";
import {
  money,
  slugify,
  statusNames,
  typeNames,
} from "../features/catalog/types";
import type { Category, Course, Product } from "../features/catalog/types";
export function AdminNav() {
  const { pathname, search } = useLocation();
  const section = pathname.startsWith("/admin/biblioteca")
    ? "Biblioteca"
    : pathname.startsWith("/admin/cursos")
      ? "Cursos"
      : "Formaciones y talleres";
  return (
    <>
      <div className="admin-breadcrumb">
        <RouterLink to="/admin">← Volver al panel administrativo</RouterLink>
        <span aria-hidden="true">/</span>
        <span>{section}</span>
      </div>
      <nav className="admin-tabs" aria-label="Administración de contenido">
        <RouterLink
          to="/admin/biblioteca"
          state={
            /\/(nuevo|nueva|editar)$/.test(pathname)
              ? { returnTo: pathname + search }
              : undefined
          }
          aria-current={section === "Biblioteca" ? "page" : undefined}
        >
          Biblioteca
        </RouterLink>
        <RouterLink
          to="/admin/cursos"
          aria-current={section === "Cursos" ? "page" : undefined}
        >
          Cursos
        </RouterLink>
        <RouterLink
          to="/admin/formaciones"
          aria-current={
            section === "Formaciones y talleres" ? "page" : undefined
          }
        >
          Formaciones y talleres
        </RouterLink>
      </nav>
    </>
  );
}
export function AdminProductsPage() {
  const query = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await api.get<Product[]>("/admin/products")).data,
  });
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function action(id: string, action: string) {
    setBusy(true);
    try {
      await mutate("/admin/products/" + id + "/" + action);
      await client.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-page">
      <AdminNav />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">LO QUE COMPARTES CON EL MUNDO</span>
          <h1>Formaciones</h1>
        </div>
        <Button
          variant="contained"
          component={RouterLink}
          to="/admin/formaciones/nueva"
          endIcon={<Icon />}
        >
          Nueva formación
        </Button>
        <Button
          component={RouterLink}
          to="/admin/formaciones/nueva?tipo=Workshop"
          variant="outlined"
        >
          Nuevo taller
        </Button>
      </div>
      <Alert severity="info" sx={{ mb: 3 }}>
        Aquí creas lo que aparecerá en el catálogo. Un curso individual incluye
        un curso; un taller agrupa y ordena cursos existentes. Usa «Nuevo
        taller» para empezar directamente con ese tipo.
      </Alert>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Buscar formación"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />
      {query.isPending ? (
        <CircularProgress />
      ) : query.isError ? (
        <Alert severity="error">No se pudieron cargar las formaciones.</Alert>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Formación</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {query.data
                .filter((p) =>
                  p.draft.title.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.draft.title}</b>
                      <small>
                        Versión publicada {p.publishedVersion || "—"}
                      </small>
                    </td>
                    <td>{typeNames[p.draft.type]}</td>
                    <td>{money(p.draft.price)}</td>
                    <td>
                      <Chip
                        size="small"
                        label={statusNames[p.status]}
                        color={p.status === "Published" ? "success" : "default"}
                      />
                    </td>
                    <td>
                      <Button
                        component={RouterLink}
                        to={"/admin/formaciones/" + p.id + "/editar"}
                      >
                        Editar
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => action(p.id, "duplicate")}
                      >
                        Duplicar
                      </Button>
                      {p.status === "Published" && (
                        <Button
                          disabled={busy}
                          onClick={() => action(p.id, "unpublish")}
                        >
                          Despublicar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {query.data.length === 0 && (
            <div className="empty-state">
              <h2>Tu primera formación empieza aquí.</h2>
              <p>Crea cursos reutilizables y conviértelos en una formación.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export function AdminCoursesPage() {
  const query = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await api.get<Course[]>("/admin/courses")).data,
  });
  return (
    <section className="admin-page">
      <AdminNav />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">UNA BIBLIOTECA DE CONOCIMIENTO</span>
          <h1>Cursos</h1>
        </div>
        <Button
          component={RouterLink}
          to="/admin/cursos/nuevo"
          variant="contained"
        >
          Nuevo curso
        </Button>
      </div>
      <Alert severity="info" sx={{ mb: 3 }}>
        Aquí preparas el contenido: temas, módulos, lecciones y cuestionario.
        Para agrupar cursos en un taller, entra en «Formaciones y talleres» y
        elige «Nuevo taller».
      </Alert>
      {query.isPending ? (
        <CircularProgress />
      ) : query.isError ? (
        <Alert severity="error">No se pudieron cargar los cursos.</Alert>
      ) : (
        <div className="product-grid">
          {query.data.map((c) => (
            <RouterLink
              key={c.id}
              to={"/admin/cursos/" + c.id + "/editar"}
              className="course-admin-card"
            >
              <Icon name="book" size={30} />
              <Chip size="small" label={statusNames[c.status]} />
              <h2>{c.draft.title}</h2>
              <p>
                {c.draft.topics.length} temas · Versión{" "}
                {c.publishedVersion || "sin publicar"}
              </p>
              <span>Editar curso ↗</span>
            </RouterLink>
          ))}
          {query.data.length === 0 && (
            <div className="empty-state">
              <h2>Aún no hay cursos.</h2>
              <p>
                El contenido se crea una vez y puede usarse en varias
                formaciones.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
export { MediaLibraryPage } from "./MediaLibraryPage";
export function CategoryCreator({
  onCreated,
}: {
  onCreated: (category: Category) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nueva categoría</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Nueva categoría</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Nombre de categoría"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await mutate("/admin/categories", {
                  name,
                  slug: slugify(name),
                });
                await client.invalidateQueries({
                  queryKey: ["admin-categories"],
                });
                onCreated(result.data);
                setOpen(false);
                setName("");
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Crear categoría
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
