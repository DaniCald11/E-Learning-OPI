import { useState } from "react";
import type { DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Radio,
  Switch,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { api, errorMessage, mutate } from "../services/api";
import { AdminNav } from "./AdminCatalogPages";
import { slugify } from "../features/catalog/types";
import type { Course, CourseDraft, Media } from "../features/catalog/types";
function move<T>(items: T[], from: number, to: number) {
  if (from < 0 || from >= items.length || from === to) return;
  items.splice(to, 0, items.splice(from, 1)[0]);
}
function drag(event: DragEvent, kind: string, index: number) {
  event.stopPropagation();
  event.dataTransfer.setData("application/opi-" + kind, String(index));
}
function drop(event: DragEvent, kind: string, change: (index: number) => void) {
  event.preventDefault();
  event.stopPropagation();
  const index = Number.parseInt(
    event.dataTransfer.getData("application/opi-" + kind),
    10,
  );
  if (Number.isInteger(index)) change(index);
}
const blank: CourseDraft = {
  title: "",
  slug: "",
  description: "",
  topics: [],
  quiz: null,
  rowVersion: null,
};
const uuid = () => crypto.randomUUID();
export function CourseEditorPage() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["course-edit", id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<Course>("/admin/courses/" + id)).data,
  });
  if (id && query.isPending) return <CircularProgress />;
  if (id && query.isError)
    return <Alert severity="error">No se pudo cargar el curso.</Alert>;
  return <CourseEditor key={id ?? "new"} initial={query.data} />;
}
function CourseEditor({ initial }: { initial?: Course }) {
  const [draft, setDraft] = useState<CourseDraft>(initial?.draft ?? blank);
  const [saved, setSaved] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const media = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => (await api.get<Media[]>("/admin/media")).data,
  });
  function edit(change: (value: CourseDraft) => void) {
    setDraft((old) => {
      const next = structuredClone(old);
      change(next);
      return next;
    });
    setDirty(true);
    setNotice("");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const result = await mutate(
        "/admin/courses" + (saved ? "/" + saved.id : ""),
        draft,
        saved ? "put" : "post",
      );
      const course = result.data as Course;
      setSaved(course);
      setDraft(course.draft);
      setDirty(false);
      setNotice("Borrador guardado.");
      client.setQueryData(["course-edit", course.id], course);
      await client.invalidateQueries({ queryKey: ["admin-courses"] });
      if (!saved)
        navigate("/admin/cursos/" + course.id + "/editar", { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function publish(action = "publish") {
    if (!saved) return;
    setBusy(true);
    setError("");
    try {
      const result = await mutate("/admin/courses/" + saved.id + "/" + action);
      const course = result.data as Course;
      setSaved(course);
      setDraft(course.draft);
      setNotice(
        action === "publish"
          ? "Versión publicada. Las versiones anteriores se conservan."
          : "Curso archivado.",
      );
      await client.invalidateQueries({ queryKey: ["admin-courses"] });
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
          <span className="eyebrow">CREA UNA VEZ. COMPARTE CON PROPÓSITO.</span>
          <h1>{saved ? "Editar curso" : "Nuevo curso"}</h1>
        </div>
        <div className="button-row">
          <Button
            disabled={busy || !saved || dirty}
            onClick={() => publish("archive")}
          >
            Archivar
          </Button>
          <Button
            disabled={busy || !saved || dirty}
            onClick={() => publish()}
            variant="outlined"
          >
            Publicar versión
          </Button>
          <Button variant="contained" disabled={busy} onClick={save}>
            {busy ? "Guardando…" : "Guardar curso"}
          </Button>
        </div>
      </div>
      {saved && (
        <p className="auth-description">
          Versión publicada: {saved.publishedVersion || "ninguna"} · Los cambios
          se guardan como borrador hasta publicar una nueva versión.
        </p>
      )}
      {dirty && <Chip size="small" label="Cambios sin guardar" />}
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ my: 3 }}>
        <Tab label="Información" />
        <Tab label="Temas y contenido" />
        <Tab label="Cuestionario" />
      </Tabs>
      {tab === 0 && (
        <div className="editor-panel">
          <TextField
            label="Título del curso"
            value={draft.title}
            onChange={(e) =>
              edit((d) => {
                d.title = e.target.value;
                if (!saved) d.slug = slugify(e.target.value);
              })
            }
          />
          <TextField
            label="Slug del curso"
            value={draft.slug}
            onChange={(e) =>
              edit((d) => {
                d.slug = e.target.value;
              })
            }
          />
          <TextField
            label="Descripción del curso"
            multiline
            minRows={4}
            value={draft.description}
            onChange={(e) =>
              edit((d) => {
                d.description = e.target.value;
              })
            }
          />
        </div>
      )}
      {tab === 1 && <Alert severity="info" sx={{mb:2}}>Organiza el curso en temas, módulos y lecciones. Guarda todo con «Guardar curso». Los controles «Mover arriba» cambian el orden; los archivos se cargan en Biblioteca.</Alert>}
      {tab === 1 && (
        <div className="editor-panel">
          {draft.topics.map((topic, ti) => (
            <Accordion
              key={topic.id}
              defaultExpanded
              draggable
              onDragStart={(e) => drag(e, "topic", ti)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) =>
                drop(e, "topic", (from) =>
                  edit((d) => move(d.topics, from, ti)),
                )
              }
            >
              <AccordionSummary expandIcon={<span>+</span>}>
                Tema {ti + 1}: {topic.title}
              </AccordionSummary>
              <AccordionDetails>
                <div className="editor-panel">
                  <div className="editor-row">
                    <TextField
                      label={"Título del tema " + (ti + 1)}
                      value={topic.title}
                      onChange={(e) =>
                        edit((d) => {
                          d.topics[ti].title = e.target.value;
                        })
                      }
                    />
                    <Button
                      disabled={ti === 0}
                      onClick={() =>
                        edit((d) => {
                          [d.topics[ti - 1], d.topics[ti]] = [
                            d.topics[ti],
                            d.topics[ti - 1],
                          ];
                        })
                      }
                    >
                      Mover arriba
                    </Button>
                    <Button
                      disabled={ti === draft.topics.length - 1}
                      onClick={() =>
                        edit((d) => {
                          [d.topics[ti + 1], d.topics[ti]] = [
                            d.topics[ti],
                            d.topics[ti + 1],
                          ];
                        })
                      }
                    >
                      Mover abajo
                    </Button>
                    <Button
                      color="error"
                      onClick={() =>
                        edit((d) => {
                          d.topics.splice(ti, 1);
                        })
                      }
                    >
                      Eliminar tema
                    </Button>
                  </div>
                  {topic.modules.map((module, mi) => (
                    <div
                      className="module-editor"
                      key={module.id}
                      draggable
                      onDragStart={(e) => drag(e, "module-" + topic.id, mi)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) =>
                        drop(e, "module-" + topic.id, (from) =>
                          edit((d) => move(d.topics[ti].modules, from, mi)),
                        )
                      }
                    >
                      <div className="editor-row">
                        <TextField
                          label={"Título del módulo " + (mi + 1)}
                          value={module.title}
                          onChange={(e) =>
                            edit((d) => {
                              d.topics[ti].modules[mi].title = e.target.value;
                            })
                          }
                        />
                        <Button
                          disabled={mi === 0}
                          onClick={() =>
                            edit((d) => {
                              const a = d.topics[ti].modules;
                              [a[mi - 1], a[mi]] = [a[mi], a[mi - 1]];
                            })
                          }
                        >
                          Mover módulo arriba
                        </Button>
                        <Button
                          onClick={() =>
                            edit((d) => {
                              d.topics[ti].modules.splice(mi, 1);
                            })
                          }
                        >
                          Eliminar módulo
                        </Button>
                      </div>
                      {module.lessons.map((lesson, li) => (
                        <div
                          className="lesson-editor"
                          key={lesson.id}
                          draggable
                          onDragStart={(e) =>
                            drag(e, "lesson-" + module.id, li)
                          }
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) =>
                            drop(e, "lesson-" + module.id, (from) =>
                              edit((d) =>
                                move(
                                  d.topics[ti].modules[mi].lessons,
                                  from,
                                  li,
                                ),
                              ),
                            )
                          }
                        >
                          <span className="eyebrow">LECCIÓN {li + 1}</span>
                          <div className="editor-row">
                            <TextField
                              label="Título de lección"
                              value={lesson.title}
                              onChange={(e) =>
                                edit((d) => {
                                  d.topics[ti].modules[mi].lessons[li].title =
                                    e.target.value;
                                })
                              }
                            />
                            <TextField
                              label="Tipo de contenido"
                              select
                              value={lesson.type}
                              onChange={(e) =>
                                edit((d) => {
                                  d.topics[ti].modules[mi].lessons[li].type =
                                    e.target.value;
                                })
                              }
                            >
                              {["Video", "Document", "Mixed"].map((x) => (
                                <MenuItem value={x} key={x}>
                                  {x === "Document"
                                    ? "Documento"
                                    : x === "Mixed"
                                      ? "Video y recursos"
                                      : "Video"}
                                </MenuItem>
                              ))}
                            </TextField>
                          </div>
                          <TextField
                            label="Materiales de biblioteca"
                            helperText={lesson.type === "Document" ? "Para publicar una lección de documento, selecciona al menos un PDF. Las imágenes no sustituyen el PDF." : "Selecciona el video y los recursos que ya cargaste en la biblioteca."}
                            select
                            slotProps={{ select: { multiple: true } }}
                            value={lesson.mediaIds}
                            onChange={(e) =>
                              edit((d) => {
                                d.topics[ti].modules[mi].lessons[li].mediaIds =
                                  typeof e.target.value === "string"
                                    ? e.target.value.split(",")
                                    : e.target.value;
                              })
                            }
                          >
                            {media.data?.map((m) => (
                              <MenuItem key={m.id} value={m.id}>
                                {m.originalFileName}
                              </MenuItem>
                            ))}
                          </TextField>
                          {lesson.type === "Document" && lesson.mediaIds.length > 0 && media.data && !media.data.some(m => lesson.mediaIds.includes(m.id) && m.contentType === "application/pdf") && <Alert severity="warning">Falta un PDF. Puedes guardar el borrador, pero esta lección no se puede publicar solo con imágenes.</Alert>}
                          <Button href="/admin/biblioteca" target="_blank" rel="noopener noreferrer">Subir archivos a la biblioteca ↗</Button>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={lesson.isRequired}
                                onChange={(_, value) =>
                                  edit((d) => {
                                    d.topics[ti].modules[mi].lessons[
                                      li
                                    ].isRequired = value;
                                  })
                                }
                              />
                            }
                            label="Lección obligatoria"
                          />
                          <div className="button-row">
                            <Button
                              disabled={li === 0}
                              onClick={() =>
                                edit((d) => {
                                  const a = d.topics[ti].modules[mi].lessons;
                                  [a[li - 1], a[li]] = [a[li], a[li - 1]];
                                })
                              }
                            >
                              Mover lección arriba
                            </Button>
                            <Button
                              color="error"
                              onClick={() =>
                                edit((d) => {
                                  d.topics[ti].modules[mi].lessons.splice(
                                    li,
                                    1,
                                  );
                                })
                              }
                            >
                              Eliminar lección
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        onClick={() =>
                          edit((d) => {
                            d.topics[ti].modules[mi].lessons.push({
                              id: uuid(),
                              title: "Nueva lección",
                              type: "Video",
                              isRequired: true,
                              mediaIds: [],
                            });
                          })
                        }
                      >
                        + Agregar lección
                      </Button>
                    </div>
                  ))}
                  <Button
                    onClick={() =>
                      edit((d) => {
                        d.topics[ti].modules.push({
                          id: uuid(),
                          title: "Nuevo módulo",
                          lessons: [],
                        });
                      })
                    }
                  >
                    + Agregar módulo
                  </Button>
                </div>
              </AccordionDetails>
            </Accordion>
          ))}
          <Button
            variant="outlined"
            onClick={() =>
              edit((d) => {
                d.topics.push({ id: uuid(), title: "Nuevo tema", modules: [] });
              })
            }
          >
            + Agregar tema
          </Button>
        </div>
      )}
      {tab === 2 && (
        <div className="editor-panel">
          <p className="auth-description">
            Obligatorio para cursos de taller. Opción múltiple, una respuesta
            correcta por pregunta. La calificación y los intentos del alumno se
            implementan en la fase de aprendizaje.
          </p>
          {!draft.quiz ? (
            <Button
              variant="outlined"
              onClick={() =>
                edit((d) => {
                  d.quiz = {
                    id: uuid(),
                    title: "Cuestionario del curso",
                    questions: [],
                  };
                })
              }
            >
              Crear cuestionario
            </Button>
          ) : (
            <>
              <TextField
                label="Título del cuestionario"
                value={draft.quiz.title}
                onChange={(e) =>
                  edit((d) => {
                    d.quiz!.title = e.target.value;
                  })
                }
              />
              {draft.quiz.questions.map((q, qi) => (
                <div className="module-editor" key={q.id}>
                  <TextField
                    fullWidth
                    label={"Pregunta " + (qi + 1)}
                    value={q.prompt}
                    onChange={(e) =>
                      edit((d) => {
                        d.quiz!.questions[qi].prompt = e.target.value;
                      })
                    }
                  />
                  <TextField
                    label="Puntos"
                    type="number"
                    value={q.points}
                    onChange={(e) =>
                      edit((d) => {
                        d.quiz!.questions[qi].points = Number(e.target.value);
                      })
                    }
                    sx={{ my: 2 }}
                  />
                  {q.options.map((o, oi) => (
                    <div className="editor-row" key={o.id}>
                      <Radio
                        checked={o.isCorrect}
                        slotProps={{
                          input: {
                            "aria-label":
                              "Marcar opción " + (oi + 1) + " como correcta",
                          },
                        }}
                        onChange={() =>
                          edit((d) => {
                            d.quiz!.questions[qi].options.forEach(
                              (option, index) => {
                                option.isCorrect = index === oi;
                              },
                            );
                          })
                        }
                      />
                      <TextField
                        label={"Opción " + (oi + 1)}
                        value={o.text}
                        onChange={(e) =>
                          edit((d) => {
                            d.quiz!.questions[qi].options[oi].text =
                              e.target.value;
                          })
                        }
                      />
                      <Button
                        disabled={q.options.length <= 2}
                        onClick={() =>
                          edit((d) => {
                            d.quiz!.questions[qi].options.splice(oi, 1);
                          })
                        }
                      >
                        Eliminar opción
                      </Button>
                    </div>
                  ))}
                  <div className="button-row">
                    <Button
                      onClick={() =>
                        edit((d) => {
                          d.quiz!.questions[qi].options.push({
                            id: uuid(),
                            text: "",
                            isCorrect: false,
                          });
                        })
                      }
                    >
                      + Opción
                    </Button>
                    <Button
                      color="error"
                      onClick={() =>
                        edit((d) => {
                          d.quiz!.questions.splice(qi, 1);
                        })
                      }
                    >
                      Eliminar pregunta
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outlined"
                onClick={() =>
                  edit((d) => {
                    d.quiz!.questions.push({
                      id: uuid(),
                      prompt: "",
                      points: 1,
                      options: [
                        { id: uuid(), text: "", isCorrect: true },
                        { id: uuid(), text: "", isCorrect: false },
                      ],
                    });
                  })
                }
              >
                + Agregar pregunta
              </Button>
              <Button
                color="error"
                onClick={() =>
                  edit((d) => {
                    d.quiz = null;
                  })
                }
              >
                Quitar cuestionario
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
