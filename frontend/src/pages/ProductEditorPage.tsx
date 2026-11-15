import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Step,
  StepButton,
  Stepper,
  TextField,
} from "@mui/material";
import { api, errorMessage, mutate } from "../services/api";
import { AdminNav, CategoryCreator } from "./AdminCatalogPages";
import { money, slugify, typeNames } from "../features/catalog/types";
import type {
  Category,
  Course,
  Media,
  Product,
  ProductDraft,
  ProductType,
} from "../features/catalog/types";
const blank: ProductDraft = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  type: "IndividualCourse",
  categoryId: "",
  price: 0,
  currency: "MXN",
  coverMediaId: null,
  courses: [],
  rowVersion: null,
};
export function ProductEditorPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["product-edit", id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Product>("/admin/products/" + id)).data,
  });
  if (id && query.isPending) return <CircularProgress />;
  if (id && query.isError)
    return <Alert severity="error">No se pudo cargar la formación.</Alert>;
  return <ProductEditor key={id ?? "new"} initial={query.data} />;
}
function ProductEditor({ initial }: { initial?: Product }) {
  const [draft, setDraft] = useState(initial?.draft ?? blank);
  const [saved, setSaved] = useState(initial);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await api.get<Category[]>("/admin/categories")).data,
  });
  const courses = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await api.get<Course[]>("/admin/courses")).data,
  });
  const media = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => (await api.get<Media[]>("/admin/media")).data,
  });
  function edit(value: Partial<ProductDraft>) {
    setDraft((old) => ({ ...old, ...value }));
    setDirty(true);
    setNotice("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await mutate(
        "/admin/products" + (saved ? "/" + saved.id : ""),
        draft,
        saved ? "put" : "post",
      );
      const p = response.data as Product;
      setSaved(p);
      setDraft(p.draft);
      setDirty(false);
      client.setQueryData(["product-edit", p.id], p);
      setNotice("Borrador guardado.");
      await client.invalidateQueries({ queryKey: ["admin-products"] });
      if (!saved)
        navigate("/admin/formaciones/" + p.id + "/editar", { replace: true });
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
          <span className="eyebrow">DEL CONOCIMIENTO A LA EXPERIENCIA</span>
          <h1>{saved ? "Editar formación" : "Nueva formación"}</h1>
        </div>
        <Button variant="contained" disabled={busy} onClick={save}>
          Guardar borrador
        </Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Stepper
        activeStep={step}
        nonLinear
        sx={{ my: 4, overflowX: "auto", pb: 2 }}
      >
        {[
          "Información",
          "Detalles",
          "Temas/Cursos",
          "Precio",
          "Diseño",
          "Publicar",
        ].map((label, i) => (
          <Step key={label}>
            <StepButton onClick={() => setStep(i)}>{label}</StepButton>
          </Step>
        ))}
      </Stepper>
      <div className="editor-panel">
        {step === 0 && (
          <>
            <TextField
              label="Título de formación"
              value={draft.title}
              onChange={(e) =>
                edit({
                  title: e.target.value,
                  ...(!saved ? { slug: slugify(e.target.value) } : {}),
                })
              }
            />
            <TextField
              label="Slug de formación"
              value={draft.slug}
              onChange={(e) => edit({ slug: e.target.value })}
            />
            <TextField
              label="Tipo de formación"
              select
              value={draft.type}
              onChange={(e) => edit({ type: e.target.value as ProductType })}
            >
              {Object.entries(typeNames).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Categoría de formación"
              select
              value={draft.categoryId}
              onChange={(e) => edit({ categoryId: e.target.value })}
            >
              {categories.data?.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <CategoryCreator
              onCreated={(category) => edit({ categoryId: category.id })}
            />
          </>
        )}
        {step === 1 && (
          <>
            <TextField
              label="Resumen de venta"
              multiline
              minRows={2}
              value={draft.summary}
              onChange={(e) => edit({ summary: e.target.value })}
            />
            <TextField
              label="Descripción de formación"
              multiline
              minRows={6}
              value={draft.description}
              onChange={(e) => edit({ description: e.target.value })}
            />
          </>
        )}
        {step === 2 && (
          <>
            <p className="auth-description">
              Selecciona cursos existentes; no se duplica su contenido. Todos
              son obligatorios en talleres.
            </p>
            {courses.data?.map((c) => (
              <label className="course-choice" key={c.id}>
                <Checkbox
                  checked={draft.courses.some((x) => x.courseId === c.id)}
                  onChange={(_, checked) =>
                    edit({
                      courses: (checked
                        ? [
                            ...draft.courses,
                            {
                              courseId: c.id,
                              position: draft.courses.length + 1,
                              isRequired: true,
                            },
                          ]
                        : draft.courses.filter((x) => x.courseId !== c.id)
                      ).map((x, i) => ({ ...x, position: i + 1 })),
                    })
                  }
                />
                <span>
                  {c.draft.title}
                  <small>
                    Versión publicada {c.publishedVersion || "ninguna"}
                  </small>
                </span>
              </label>
            ))}
            <h3>Orden del recorrido</h3>
            {draft.courses.map((c, i) => (
              <div
                className="editor-row ordered-course"
                draggable
                key={c.courseId}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", String(i))
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (
                    !Number.isInteger(from) ||
                    from < 0 ||
                    from >= draft.courses.length
                  )
                    return;
                  const ordered = [...draft.courses];
                  ordered.splice(i, 0, ordered.splice(from, 1)[0]);
                  edit({
                    courses: ordered.map((x, index) => ({
                      ...x,
                      position: index + 1,
                    })),
                  });
                }}
              >
                <b>
                  {i + 1}.{" "}
                  {courses.data?.find((x) => x.id === c.courseId)?.draft.title}
                </b>
                <Button
                  disabled={i === 0}
                  onClick={() => {
                    const ordered = [...draft.courses];
                    [ordered[i - 1], ordered[i]] = [ordered[i], ordered[i - 1]];
                    edit({
                      courses: ordered.map((x, index) => ({
                        ...x,
                        position: index + 1,
                      })),
                    });
                  }}
                >
                  Subir curso
                </Button>
                <Button
                  disabled={i === draft.courses.length - 1}
                  onClick={() => {
                    const ordered = [...draft.courses];
                    [ordered[i + 1], ordered[i]] = [ordered[i], ordered[i + 1]];
                    edit({
                      courses: ordered.map((x, index) => ({
                        ...x,
                        position: index + 1,
                      })),
                    });
                  }}
                >
                  Bajar curso
                </Button>
              </div>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <TextField
              label="Precio MXN"
              type="number"
              value={draft.price}
              onChange={(e) => edit({ price: Number(e.target.value) })}
            />
            <p className="auth-description">
              Moneda: MXN. Máximo dos decimales. El cobro se implementa en la
              siguiente fase.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <TextField
              select
              label="Portada de formación"
              value={draft.coverMediaId ?? ""}
              onChange={(e) => edit({ coverMediaId: e.target.value || null })}
            >
              <MenuItem value="">Sin imagen</MenuItem>
              {media.data
                ?.filter((m) => m.contentType.startsWith("image/"))
                .map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.originalFileName}
                  </MenuItem>
                ))}
            </TextField>
            <div className="formation-preview">
              <span className="eyebrow">VISTA PREVIA DEL BORRADOR</span>
              <h2>{draft.title || "Título de tu formación"}</h2>
              <p>{draft.summary || "Tu resumen de venta aparecerá aquí."}</p>
              <b>{money(draft.price)} MXN</b>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <h2>Listo para compartir.</h2>
            <p>
              Se congelará una nueva versión de cursos, contenido y
              cuestionarios. Las versiones anteriores permanecen intactas.
            </p>
            {dirty && (
              <Alert severity="info">
                Guarda los cambios antes de publicar.
              </Alert>
            )}
            <Button
              variant="contained"
              disabled={!saved || dirty || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const response = await mutate(
                    "/admin/products/" + saved!.id + "/publish",
                  );
                  setSaved(response.data);
                  setDraft(response.data.draft);
                  setNotice("Formación publicada.");
                  await client.invalidateQueries({
                    queryKey: ["admin-products"],
                  });
                  await client.invalidateQueries({ queryKey: ["catalog"] });
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Publicar formación
            </Button>
          </>
        )}
      </div>
      <div className="wizard-controls">
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
          Anterior
        </Button>
        <span>Paso {step + 1} de 6</span>
        <Button disabled={step === 5} onClick={() => setStep(step + 1)}>
          Siguiente →
        </Button>
      </div>
    </section>
  );
}
