import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  IconButton,
  MenuItem,
  TextField,
} from "@mui/material";
import { api, errorMessage, mutate } from "../services/api";
import { Icon } from "../components/Icon";
import { AdminNav } from "./AdminCatalogPages";
import type { Media } from "../features/catalog/types";
interface Folder {
  id: string;
  name: string;
}
export function MediaLibraryPage() {
  const query = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => (await api.get<Media[]>("/admin/media")).data,
  });
  const folders = useQuery({
    queryKey: ["admin-media-folders"],
    queryFn: async () => (await api.get<Folder[]>("/admin/media-folders")).data,
  });
  const client = useQueryClient();
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === "string" &&
    /^\/admin\/(cursos|formaciones)\//.test(location.state.returnTo)
      ? location.state.returnTo
      : null;
  const [folder, setFolder] = useState("/all");
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const files =
    query.data?.filter(
      (m) =>
        (folder === "/all" || m.folder === folder) &&
        (m.originalFileName + " " + m.folder)
          .toLowerCase()
          .includes(filter.toLowerCase()),
    ) ?? [];
  return (
    <section className="admin-page">
      <AdminNav />
      {returnTo && (
        <Button component={RouterLink} to={returnTo} sx={{ mb: 2 }}>
          ← Volver al editor sin perder cambios
        </Button>
      )}
      <div className="admin-heading">
        <div>
          <span className="eyebrow">PRIMERO, PREPARA TUS MATERIALES</span>
          <h1>Biblioteca</h1>
        </div>
        <div className="button-row">
          <Button
            variant="outlined"
            onClick={() => {
              setEditing(null);
              setName("");
              setOpen(true);
              setError("");
            }}
          >
            Nueva carpeta
          </Button>
          <Button component="label" variant="contained" disabled={busy}>
            {busy ? "Subiendo…" : "Subir archivos"}
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.mp4,.webm"
              onChange={async (event) => {
                const input = event.currentTarget;
                const selected = Array.from(input.files ?? []);
                if (!selected.length) return;
                setBusy(true);
                setError("");
                setNotice("");
                let count = 0;
                try {
                  for (const file of selected) {
                    const data = new FormData();
                    data.append("file", file);
                    data.append("folder", folder === "/all" ? "" : folder);
                    await mutate("/admin/media", data);
                    count++;
                  }
                  setNotice(`${count} archivo(s) cargado(s).`);
                } catch (e) {
                  setError(
                    `${count > 0 ? count + " archivo(s) cargado(s). " : ""}${errorMessage(e)}`,
                  );
                } finally {
                  await client.invalidateQueries({ queryKey: ["admin-media"] });
                  setBusy(false);
                  input.value = "";
                }
              }}
            />
          </Button>
        </div>
      </div>
      <p className="auth-description">
        Carga aquí los videos, PDF, imágenes y recursos que usarás en tus
        cursos. Hasta 100 MB por archivo. Después puedes asociar varios archivos
        a cada lección.
      </p>
      <div className="library-toolbar">
        <TextField
          label="Carpeta actual"
          select
          value={folder}
          slotProps={{
            select: { displayEmpty: true },
            inputLabel: { shrink: true },
          }}
          onChange={(e) => setFolder(e.target.value)}
          helperText={
            folder === "/all"
              ? "Las cargas desde esta vista se guardan en «Sin carpeta»."
              : "Los archivos nuevos se guardarán en esta carpeta."
          }
        >
          <MenuItem value="/all">Todos los archivos</MenuItem>
          <MenuItem value="">Sin carpeta</MenuItem>
          {folders.data?.map((f) => (
            <MenuItem key={f.id} value={f.name}>
              {f.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Buscar archivo o carpeta"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon name="search" />
                </InputAdornment>
              ),
            },
          }}
        />
      </div>
      <div className="folder-list" aria-label="Carpetas de la biblioteca">
        {folders.data
          ?.filter(
            (f) =>
              !filter || f.name.toLowerCase().includes(filter.toLowerCase()),
          )
          .map((f) => (
            <div className="folder-item" key={f.id}>
              <Button
                disabled={busy}
                variant={folder === f.name ? "contained" : "outlined"}
                startIcon={<Icon name="folder" />}
                onClick={() => setFolder(f.name)}
              >
                {f.name}
              </Button>
              <IconButton
                size="small"
                disabled={busy}
                aria-label={"Editar carpeta " + f.name}
                title="Cambiar nombre"
                onClick={() => {
                  setEditing(f);
                  setName(f.name);
                  setError("");
                  setOpen(true);
                }}
              >
                <Icon name="edit" size={18} />
              </IconButton>
              <IconButton
                size="small"
                disabled={busy}
                aria-label={"Eliminar carpeta " + f.name}
                title="Eliminar carpeta"
                onClick={() => {
                  setDeleting(f);
                  setError("");
                }}
              >
                <Icon name="trash" size={18} />
              </IconButton>
            </div>
          ))}
      </div>
      {error && !open && !deleting && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      {(query.isError || folders.isError) && (
        <Alert severity="error">
          No se pudo cargar la biblioteca. Comprueba que la API y las
          migraciones estén actualizadas.
        </Alert>
      )}
      {query.isPending ? (
        <CircularProgress aria-label="Cargando biblioteca" />
      ) : (
        <div className="media-grid">
          {files.map((m) => (
            <article className="media-card" key={m.id}>
              {m.contentType.startsWith("image/") ? (
                <img src={"/api/v1/admin/media/" + m.id + "/content"} alt="" />
              ) : (
                <Icon name="book" size={38} />
              )}
              <h3>{m.originalFileName}</h3>
              <p>
                {m.folder || "Sin carpeta"} ·{" "}
                {(m.sizeBytes / 1024 / 1024).toFixed(2)} MB
              </p>
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
              <a
                href={"/api/v1/admin/media/" + m.id + "/content"}
                target="_blank"
                rel="noreferrer"
              >
                Previsualizar archivo ↗
              </a>
              <TextField
                label={"Carpeta de " + m.originalFileName}
                size="small"
                select
                fullWidth
                sx={{ mt: 2 }}
                value={m.folder}
                slotProps={{
                  select: { displayEmpty: true },
                  inputLabel: { shrink: true },
                }}
                onChange={async (event) => {
                  setError("");
                  try {
                    await mutate(
                      "/admin/media/" + m.id,
                      { folder: event.target.value },
                      "patch",
                    );
                    await client.invalidateQueries({
                      queryKey: ["admin-media"],
                    });
                    setNotice("Archivo movido.");
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                <MenuItem value="">Sin carpeta</MenuItem>
                {folders.data?.map((f) => (
                  <MenuItem key={f.id} value={f.name}>
                    {f.name}
                  </MenuItem>
                ))}
              </TextField>
            </article>
          ))}
          {!query.isError && files.length === 0 && (
            <div className="empty-state">
              <Icon name="folder" size={32} />
              <h2>
                {folder === "/all"
                  ? "Tu biblioteca está lista."
                  : "Esta carpeta está vacía."}
              </h2>
              <p>
                Usa «Subir archivos» para añadir tus materiales, o cambia la
                búsqueda.
              </p>
            </div>
          )}
        </div>
      )}
      <Dialog open={open} onClose={() => !busy && setOpen(false)}>
        <DialogTitle>
          {editing ? "Editar carpeta" : "Crear carpeta"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            autoFocus
            label="Nombre de carpeta"
            value={name}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(e) => setName(e.target.value)}
            sx={{ mt: 1 }}
            helperText={
              editing
                ? "Los archivos conservarán sus asociaciones con los cursos."
                : "Puedes crearla vacía y añadir archivos después."
            }
          />
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await mutate(
                  "/admin/media-folders" + (editing ? "/" + editing.id : ""),
                  { name },
                  editing ? "patch" : "post",
                );
                await client.invalidateQueries({
                  queryKey: ["admin-media-folders"],
                });
                await client.invalidateQueries({ queryKey: ["admin-media"] });
                setFolder(result.data.name);
                setOpen(false);
                setName("");
                setNotice(
                  editing
                    ? "Nombre de carpeta actualizado."
                    : "Carpeta creada.",
                );
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {editing ? "Guardar nombre" : "Crear carpeta"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onClose={() => !busy && setDeleting(null)}
      >
        <DialogTitle>Eliminar carpeta</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error">{error}</Alert>}
          <p>¿Eliminar la carpeta «{deleting?.name}»?</p>
          <p>
            Los archivos pasarán a «Sin carpeta». No se borrarán y seguirán
            disponibles en los cursos donde ya los añadiste.
          </p>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            color="error"
            disabled={busy}
            onClick={async () => {
              if (!deleting) return;
              setBusy(true);
              setError("");
              try {
                await mutate(
                  "/admin/media-folders/" + deleting.id,
                  undefined,
                  "delete",
                );
                if (folder === deleting.name) setFolder("");
                await client.invalidateQueries({
                  queryKey: ["admin-media-folders"],
                });
                await client.invalidateQueries({ queryKey: ["admin-media"] });
                setDeleting(null);
                setNotice(
                  "Carpeta eliminada. Sus archivos están en Sin carpeta.",
                );
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Eliminar carpeta
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}
