import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Icon } from "../components/Icon";
import { sessionKey, useSession } from "../features/auth/session";
import type { Profile } from "../features/auth/session";
import { errorMessage, mutate } from "../services/api";
export function ProfilePage() {
  const session = useSession();
  if (session.isPending)
    return <CircularProgress aria-label="Cargando perfil" />;
  if (!session.data)
    return <Alert severity="error">No se pudo cargar tu perfil.</Alert>;
  return <ProfileEditor key={session.data.id} profile={session.data} />;
}
function ProfileEditor({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.fullName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  async function refresh() {
    await client.invalidateQueries({ queryKey: sessionKey });
  }
  return (
    <section className="account-page">
      <div className="account-heading">
        <span className="eyebrow">TU CUENTA PERSONAL</span>
        <h1>Mi perfil</h1>
        <p>Actualiza tus datos y personaliza cómo aparece tu cuenta.</p>
      </div>
      <div className="profile-layout">
        <aside className="account-card profile-summary">
          <Avatar
            className="profile-photo"
            src={profile.avatarUrl ?? undefined}
            alt={"Foto de " + profile.fullName}
          >
            {profile.fullName.slice(0, 1).toUpperCase()}
          </Avatar>
          <h2>{profile.fullName}</h2>
          <p>{profile.email}</p>
          <span className="status-chip">
            <Icon name="shield" size={14} /> Correo confirmado
          </span>
          <div className="profile-photo-actions">
            <Button component="label" variant="outlined" disabled={busy}>
              Cambiar foto
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg"
                aria-label="Seleccionar foto de perfil"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  setError("");
                  setNotice("");
                  if (
                    !["image/png", "image/jpeg"].includes(file.type) ||
                    file.size > 2 * 1024 * 1024
                  ) {
                    setError("Usa una foto PNG o JPG de hasta 2 MB.");
                    input.value = "";
                    return;
                  }
                  setBusy(true);
                  try {
                    const data = new FormData();
                    data.append("file", file);
                    await mutate("/users/me/avatar", data);
                    await refresh();
                    setNotice("Foto de perfil actualizada.");
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setBusy(false);
                    input.value = "";
                  }
                }}
              />
            </Button>
            {profile.avatarUrl && (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await mutate("/users/me/avatar", undefined, "delete");
                    await refresh();
                    setNotice("Foto eliminada.");
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Eliminar foto
              </Button>
            )}
            <small>JPG o PNG · hasta 2 MB</small>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </aside>
        <form
          className="account-card profile-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            setNotice("");
            try {
              await mutate("/users/me", { fullName: name, bio }, "patch");
              await refresh();
              setNotice("Perfil actualizado.");
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="eyebrow">DATOS PERSONALES</span>
          <h2>Tu información</h2>
          {error && <Alert severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}
          <TextField
            label="Nombre completo"
            value={name}
            required
            autoComplete="name"
            slotProps={{ htmlInput: { minLength: 2, maxLength: 200 } }}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Sobre mí (opcional)"
            value={bio}
            multiline
            minRows={4}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            helperText={`${bio.length}/500 · Una breve descripción de quién eres.`}
            onChange={(e) => setBio(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={busy}
            endIcon={<Icon />}
          >
            {busy ? "Guardando…" : "Guardar perfil"}
          </Button>
        </form>
      </div>
    </section>
  );
}
