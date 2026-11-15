import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
import type {
  Category,
  Course,
  Media,
  Product,
} from "../features/catalog/types";
export function AdminNav() {
  return (
    <nav className="admin-tabs" aria-label="Administración de contenido">
      <RouterLink to="/admin/formaciones">Formaciones</RouterLink>
      <RouterLink to="/admin/cursos">Cursos</RouterLink>
      <RouterLink to="/admin/biblioteca">Biblioteca</RouterLink>
      <RouterLink to="/admin">Mi cuenta</RouterLink>
    </nav>
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
      </div>
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
export function MediaLibraryPage() {
  const query = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => (await api.get<Media[]>("/admin/media")).data,
  });
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  return (
    <section className="admin-page">
      <AdminNav />
      <div className="admin-heading">
        <div>
          <span className="eyebrow">TODO TU CONTENIDO, EN UN LUGAR</span>
          <h1>Biblioteca</h1>
        </div>
        <Button component="label" variant="contained" disabled={busy}>
          {busy ? "Subiendo…" : "Subir archivo"}
          <input
            hidden
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.mp4,.webm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              const data = new FormData();
              data.append("file", file);
              data.append("folder", folder);
              try {
                await mutate("/admin/media", data);
                await client.invalidateQueries({ queryKey: ["admin-media"] });
              } catch (error) {
                setError(errorMessage(error));
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </Button>
      </div>
      <p className="auth-description">
        Archivos privados. PDF, imágenes, MP4 y WebM, hasta 100 MB por archivo.
      </p>
      <div className="catalog-filters">
        <TextField
          label="Carpeta para nuevas cargas"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
        <TextField
          label="Buscar archivo o carpeta"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {query.isError && (
        <Alert severity="error">No se pudo cargar la biblioteca.</Alert>
      )}
      {query.isPending ? (
        <CircularProgress />
      ) : (
        <div className="media-grid">
          {query.data
            ?.filter((m) =>
              (m.originalFileName + " " + m.folder)
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((m) => (
              <article className="media-card" key={m.id}>
                {m.contentType.startsWith("image/") ? (
                  <img
                    src={"/api/v1/admin/media/" + m.id + "/content"}
                    alt=""
                  />
                ) : (
                  <Icon
                    name={
                      m.contentType === "application/pdf" ? "book" : "spark"
                    }
                    size={38}
                  />
                )}
                <h3>{m.originalFileName}</h3>
                {m.processingStatus !== "Ready" && (
                  <Button
                    onClick={async () => {
                      try {
                        await mutate("/admin/media/" + m.id + "/refresh");
                        await client.invalidateQueries({
                          queryKey: ["admin-media"],
                        });
                      } catch (e) {
                        setError(errorMessage(e));
                      }
                    }}
                  >
                    Actualizar procesamiento
                  </Button>
                )}
                <p>
                  {m.folder || "Sin carpeta"} ·{" "}
                  {(m.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </p>
                <a
                  href={"/api/v1/admin/media/" + m.id + "/content"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Previsualizar archivo ↗
                </a>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
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
