import { useState } from "react";
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Link, Stack, Typography } from "@mui/material";
import { Icon } from "../components/Icon";
import { AuthForm } from "../components/AuthForm";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetSchema,
} from "../features/auth/schemas";
import { fetchProfile, landing, sessionKey } from "../features/auth/session";
import { errorMessage, mutate } from "../services/api";
const emailField = {
  name: "email" as const,
  label: "Correo electrónico",
  type: "email",
  autoComplete: "email",
};
export function LoginPage() {
  const query = useQueryClient();
  const navigate = useNavigate();
  return (
    <Stack spacing={3}>
      <AuthForm
        title="Inicia sesión"
        description="Qué bueno verte de nuevo. Retoma tu camino desde aquí."
        eyebrow="BIENVENIDO DE VUELTA"
        schema={loginSchema}
        fields={[
          emailField,
          {
            name: "password",
            label: "Contraseña",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
        submitLabel="Entrar"
        onSubmit={async (data) => {
          await mutate("/auth/login", data);
          const profile = await fetchProfile();
          query.setQueryData(sessionKey, profile);
          if (profile) navigate(landing(profile), { replace: true });
        }}
      />
      <div className="auth-links">
        <Link component={RouterLink} to="/recuperar-contrasena">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link component={RouterLink} to="/registro">
          Crear cuenta
        </Link>
      </div>
    </Stack>
  );
}
export function RegisterPage() {
  return (
    <Stack>
      <AuthForm
        title="Crea tu cuenta"
        description="Da el primer paso. Confirma tu correo y haz tuyo este espacio."
        eyebrow="EMPIEZA ALGO NUEVO"
        schema={registerSchema}
        fields={[
          { name: "fullName", label: "Nombre completo", autoComplete: "name" },
          emailField,
          {
            name: "password",
            label: "Contraseña",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
        onSubmit={async (data) => {
          await mutate("/auth/register", data);
        }}
        submitLabel="Registrarme"
        success="Revisa tu correo para confirmar tu cuenta antes de iniciar sesión."
      />
      <p className="auth-link-foot">
        <Link component={RouterLink} to="/login">
          Volver a iniciar sesión
        </Link>
      </p>
    </Stack>
  );
}
export function ForgotPage() {
  return (
    <Stack>
      <AuthForm
        title="Recupera tu contraseña"
        description="Te enviaremos un enlace para elegir una nueva contraseña. El enlace es válido durante una hora."
        eyebrow="VOLVAMOS A EMPEZAR"
        schema={emailSchema}
        fields={[emailField]}
        onSubmit={async (data) => {
          await mutate("/auth/forgot-password", data);
        }}
        submitLabel="Enviar instrucciones"
        success="Si la cuenta existe y está confirmada, recibirás instrucciones."
      />
      <p className="auth-link-foot">
        <Link component={RouterLink} to="/login">
          Volver a iniciar sesión
        </Link>
      </p>
    </Stack>
  );
}
export function ResetPage() {
  const [params] = useSearchParams();
  if (!params.get("token") || !params.get("email"))
    return <Alert severity="error">El enlace está incompleto.</Alert>;
  return (
    <Stack>
      <AuthForm
        title="Nueva contraseña"
        description="Elige una contraseña que solo tú conozcas."
        schema={resetSchema}
        fields={[
          {
            name: "password",
            label: "Nueva contraseña",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
        onSubmit={async (data) => {
          await mutate("/auth/reset-password", {
            ...data,
            email: params.get("email"),
            token: params.get("token"),
          });
        }}
        success="Contraseña actualizada. Ya puedes iniciar sesión."
      />
      <p className="auth-link-foot">
        <Link component={RouterLink} to="/login">
          Volver a iniciar sesión
        </Link>
      </p>
    </Stack>
  );
}
export function ConfirmPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Stack spacing={3}>
      <div>
        <div className="confirm-symbol">
          <Icon name={message ? "check" : "mail"} size={28} />
        </div>
        <span className="eyebrow">UN ÚLTIMO PASO</span>
        <Typography component="h1" variant="h4" sx={{ mt: 1 }}>
          Confirma tu correo
        </Typography>
        <p className="auth-description">
          Así sabemos que esta cuenta te pertenece. El enlace de confirmación es
          válido durante una hora.
        </p>
      </div>
      {(!params.get("userId") || !params.get("token")) && (
        <Alert severity="warning">
          Abre esta página desde el enlace de tu correo de confirmación.
        </Alert>
      )}
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <ol className="verify-steps">
        <li>
          <b>1</b> Crea tu cuenta.
        </li>
        <li>
          <b>2</b> Abre el enlace enviado a tu correo.
        </li>
        <li>
          <b>3</b> Confirma e inicia sesión.
        </li>
      </ol>
      <Button
        variant="contained"
        endIcon={<Icon />}
        disabled={
          busy ||
          Boolean(message) ||
          !params.get("userId") ||
          !params.get("token")
        }
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await mutate("/auth/confirm-email", {
              userId: params.get("userId"),
              token: params.get("token"),
            });
            setMessage("Correo confirmado. Ya puedes iniciar sesión.");
          } catch (failure) {
            setError(errorMessage(failure));
          } finally {
            setBusy(false);
          }
        }}
      >
        Confirmar correo
      </Button>
      <Link component={RouterLink} to="/login">
        Ir a iniciar sesión
      </Link>
    </Stack>
  );
}
