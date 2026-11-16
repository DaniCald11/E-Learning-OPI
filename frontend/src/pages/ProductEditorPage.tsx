import { useState } from "react";
import type { SetStateAction } from "react";
import { useEditorDraft } from "../features/catalog/useEditorDraft";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  InputAdornment,
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
  const [params] = useSearchParams();
  const initialType: ProductType =
    params.get("tipo") === "Workshop" ? "Workshop" : "IndividualCourse";
  const query = useQuery({
    queryKey: ["product-edit", id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Product>("/admin/products/" + id)).data,
  });
  if (id && query.isPending) return <CircularProgress />;
  if (id && query.isError)
    return <Alert severity="error">No se pudo cargar la formación.</Alert>;
  return (
    <ProductEditor
      key={id ?? "new-" + initialType}
      initial={query.data}
      initialType={initialType}
    />
  );
}
function ProductEditor({
  initial,
  initialType,
}: {
  initial?: Product;
  initialType: ProductType;
}) {
  const location = useLocation();
  const editor = useEditorDraft(
    "product:" + (initial?.id ?? "new-" + initialType),
    {
      draft: initial?.draft ?? { ...blank, type: initialType },
      saved: initial,
      step: typeof location.state?.step === "number" ? location.state.step : 0,
      dirty: false as boolean,
      priceInput: initial?.draft.price ? String(initial.draft.price) : "",
    },
  );
  const { draft, saved, step, dirty, priceInput } = editor.state;
  function setDraft(value: SetStateAction<ProductDraft>) {
    editor.setState((old) => ({
      ...old,
      draft: typeof value === "function" ? value(old.draft) : value,
    }));
  }
  function setSaved(value: Product) {
    editor.setState((old) => ({ ...old, saved: value }));
  }
  function setStep(value: number) {
    editor.setState((old) => ({ ...old, step: value }));
  }
  function setDirty(value: boolean) {
    editor.setState((old) => ({ ...old, dirty: value }));
  }
  const [error, setError] = useState<string>(location.state?.editorError ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>(
    location.state?.editorNotice ?? "",
  );
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
  const missing = [
    ...(!draft.title.trim() || draft.title.trim().length < 2
      ? ["Título de la formación"]
      : []),
    ...(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) ? ["Slug válido"] : []),
    ...(!draft.categoryId ? ["Categoría"] : []),
    ...(!draft.summary.trim() ? ["Resumen de venta"] : []),
    ...(!(draft.price > 0) ? ["Precio mayor que cero"] : []),
    ...(!draft.courses.length ? ["Al menos un curso"] : []),
    ...(draft.type === "IndividualCourse" && draft.courses.length !== 1
      ? ["Un único curso para venta individual"]
      : []),
  ];
  async function save(redirect = true) {
    if (missing.length) {
      setError(
        "Completa estos datos para guardar: " +
          missing.join(", ") +
          ". Tu trabajo se conserva en este navegador.",
      );
      return;
    }
    let navigating = false;
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
      if (redirect) setNotice("Borrador guardado.");
      await client.invalidateQueries({ queryKey: ["admin-products"] });
      if (!saved && redirect) {
        editor.clear();
        navigating = true;
        navigate("/admin/formaciones/" + p.id + "/editar", {
          replace: true,
          state: { step, editorNotice: "Borrador guardado." },
        });
      }
      return p;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (redirect && !navigating) setBusy(false);
    }
  }
  async function publish() {
    setBusy(true);
    setError("");
    setNotice("");
    let target = saved;
    let issue = "";
    let message = "";
    try {
      target = !saved || dirty ? await save(false) : saved;
      if (!target) return;
      const response = await mutate(
        "/admin/products/" + target.id + "/publish",
      );
      target = response.data as Product;
      setSaved(target);
      setDraft(target.draft);
      setDirty(false);
      message = "Formación publicada.";
      setNotice(message);
      client.setQueryData(["product-edit", target.id], target);
      await client.invalidateQueries({ queryKey: ["admin-products"] });
      await client.invalidateQueries({ queryKey: ["catalog"] });
    } catch (e) {
      issue = errorMessage(e);
      setError(issue);
      setNotice("");
    } finally {
      if (!saved && target) {
        client.setQueryData(["product-edit", target.id], target);
        editor.clear();
        navigate("/admin/formaciones/" + target.id + "/editar", {
          replace: true,
          state: {
            step: 5,
            editorError: issue,
            editorNotice: issue ? "" : message,
          },
        });
      } else {
        setBusy(false);
      }
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
        <Button variant="contained" disabled={busy} onClick={() => save()}>
          Guardar borrador
        </Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      {!notice && saved?.status === "Published" && !dirty && (
        <Alert severity="success">
          Formación publicada. Ya está disponible en el catálogo.
        </Alert>
      )}
      {!editor.persistent && (
        <Alert severity="warning">
          Este navegador no permite conservar el borrador al recargar. Guarda
          antes de cerrar la página.
        </Alert>
      )}
      {dirty && (
        <Button
          onClick={() => {
            if (
              window.confirm(
                "¿Descartar los cambios locales y cargar la última versión guardada?",
              )
            ) {
              editor.clear();
              window.location.reload();
            }
          }}
        >
          Descartar cambios locales
        </Button>
      )}
      <p className="draft-note">
        Tus cambios y el paso actual se conservan al navegar o recargar. Guarda
        el borrador para conservarlo en tu cuenta.
      </p>
      <Stepper
        className="formation-stepper"
        alternativeLabel
        activeStep={step}
        nonLinear
        sx={{ my: 4 }}
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
          <Alert severity="info">
            Un curso individual ofrece un solo curso. Un taller reúne cursos
            existentes en un orden de aprendizaje; sus cursos no se venden por
            separado. Una certificación reúne cursos y emite un documento final
            según sus requisitos.
          </Alert>
        )}
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
            <p className="auth-description">
              «Subir curso» y «Bajar curso» cambian su posición. Se habilitan
              cuando hay otro curso hacia el que moverlo.
            </p>
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
              type="text"
              value={priceInput}
              slotProps={{
                htmlInput: { inputMode: "decimal" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">MXN</InputAdornment>
                  ),
                },
              }}
              onChange={(e) => {
                const value = e.target.value.replace(",", ".");
                if (/^\d{0,9}(\.\d{0,2})?$/.test(value))
                  editor.setState((old) => ({
                    ...old,
                    priceInput: value,
                    draft: { ...old.draft, price: Number(value) || 0 },
                    dirty: true,
                  }));
              }}
            />
            <p className="auth-description">
              Escribe el importe en pesos, con hasta dos decimales. Por ejemplo:
              $2000 MXN.
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
              {draft.coverMediaId && (
                <img
                  className="draft-cover"
                  src={"/api/v1/admin/media/" + draft.coverMediaId + "/content"}
                  alt="Portada de la formación en el borrador"
                />
              )}
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
              Al publicar, esta formación aparecerá en el catálogo.
              Conservaremos una copia de su contenido y requisitos para que los
              cambios futuros no alteren lo adquirido por alumnos anteriores.
            </p>
            {missing.length > 0 ? (
              <Alert severity="info">
                Para publicar falta: {missing.join(", ")}.
              </Alert>
            ) : (
              <Alert severity="success" role="status">
                Los datos básicos están completos. Al publicar se guardarán tus
                cambios y se validarán los cursos, videos y cuestionarios.
              </Alert>
            )}
            {!saved && (
              <p className="auth-description">
                No necesitas guardar por separado: «Publicar formación» guardará
                el borrador antes de publicarlo.
              </p>
            )}
            {dirty && saved && (
              <p className="auth-description">
                Los cambios pendientes se guardarán al publicar.
              </p>
            )}
            <Button
              variant="contained"
              disabled={missing.length > 0 || busy}
              onClick={publish}
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
