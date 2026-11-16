import { useState } from "react";
import { Autocomplete, Button, TextField } from "@mui/material";
import type { Media } from "./types";
import { Icon } from "../../components/Icon";

export function LessonMaterials({
  files,
  ids,
  onAdd,
  onRemove,
  onMove,
  loading,
}: {
  files: Media[];
  ids: string[];
  onAdd: (file: Media) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<Media | null>(null);
  const [search, setSearch] = useState("");
  return (
    <div className="lesson-materials">
      <Autocomplete
        options={files.filter((file) => !ids.includes(file.id))}
        value={selected}
        inputValue={search}
        onInputChange={(_, value, reason) => {
          setSearch(value);
          if (reason === "input") setSelected(null);
        }}
        onChange={(_, value) => setSelected(value)}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        getOptionLabel={(file) => file.originalFileName}
        getOptionKey={(file) => file.id}
        loading={loading}
        loadingText="Cargando materiales…"
        noOptionsText="No hay archivos disponibles con ese nombre."
        renderOption={({ key, ...props }, file) => (
          <li {...props} key={key}>
            <span>
              {file.originalFileName}
              <small className="material-option-detail">
                {file.folder || "Sin carpeta"} ·{" "}
                {file.processingStatus === "Ready"
                  ? "Listo"
                  : "En procesamiento"}
              </small>
            </span>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Buscar material por nombre"
            helperText="Selecciona un archivo y pulsa Añadir. Puedes repetirlo para agregar varios videos y recursos."
          />
        )}
      />
      <Button
        className="add-material-button"
        variant="outlined"
        disabled={!selected || ids.includes(selected.id)}
        onClick={() => {
          if (!selected || ids.includes(selected.id)) return;
          onAdd(selected);
          setSelected(null);
          setSearch("");
        }}
        startIcon={<Icon name="plus" />}
      >
        Añadir
      </Button>
      <div className="lesson-material-list" aria-label="Archivos de la lección">
        <p className="auth-description">
          {ids.length
            ? `${ids.length} archivo(s) añadido(s) a esta lección.`
            : "Todavía no hay archivos añadidos a esta lección."}
        </p>
        {ids.map((id, index) => {
          const file = files.find((value) => value.id === id);
          const name = file?.originalFileName ?? "Archivo no disponible";
          return (
            <div className="material-row" key={id}>
              <span>
                <b>{name}</b>
                <small>
                  {file?.contentType.startsWith("video/")
                    ? "Video"
                    : file?.contentType === "application/pdf"
                      ? "PDF"
                      : "Recurso"}
                </small>
              </span>
              <Button
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                aria-label={"Subir archivo " + name}
              >
                Subir
              </Button>
              <Button
                disabled={index === ids.length - 1}
                onClick={() => onMove(index, index + 1)}
                aria-label={"Bajar archivo " + name}
              >
                Bajar
              </Button>
              <Button
                onClick={() => onRemove(id)}
                aria-label={"Quitar archivo " + name}
              >
                Quitar
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
