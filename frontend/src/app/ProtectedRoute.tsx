import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Alert, CircularProgress } from "@mui/material";
import { useSession } from "../features/auth/session";
export function ProtectedRoute({
  role,
  children,
}: {
  role?: string;
  children: ReactNode;
}) {
  const { data, isPending, isError } = useSession();
  if (isPending) return <CircularProgress aria-label="Cargando sesión" />;
  if (isError)
    return (
      <Alert severity="error">
        No se pudo verificar tu sesión. Vuelve a intentarlo.
      </Alert>
    );
  if (!data) return <Navigate to="/login" replace />;
  if (role && !data.roles.includes(role))
    return (
      <Alert severity="error">
        No tienes permiso para acceder a esta página.
      </Alert>
    );
  return children;
}
