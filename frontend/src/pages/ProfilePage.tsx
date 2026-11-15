import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { AuthForm } from "../components/AuthForm";
import { profileSchema } from "../features/auth/schemas";
import { sessionKey, useSession } from "../features/auth/session";
import { mutate } from "../services/api";
export function ProfilePage() {
  const { data } = useSession();
  const query = useQueryClient();
  return (
    <section className="account-page">
      <div className="account-heading">
        <span className="eyebrow">TU ESPACIO PERSONAL</span>
        <h1>Mi perfil</h1>
        <p>Los pequeños detalles también hablan de ti.</p>
      </div>
      <div className="profile-layout">
        <aside className="account-card">
          <div className="account-avatar">
            {data?.fullName.slice(0, 1).toUpperCase()}
          </div>
          <h2>{data?.fullName}</h2>
          <p>{data?.email}</p>
          <span className="status-chip">
            <Icon name="shield" size={14} /> Correo confirmado
          </span>
        </aside>
        <div className="account-card">
          <p className="auth-description">Nombre actual: {data?.fullName}</p>
          <AuthForm
            title="Tus datos"
            description="Actualiza el nombre que aparece en tu cuenta."
            schema={profileSchema}
            fields={[
              {
                name: "fullName",
                label: "Nombre completo",
                autoComplete: "name",
              },
            ]}
            onSubmit={async (values) => {
              await mutate("/users/me", values, "patch");
              await query.invalidateQueries({ queryKey: sessionKey });
            }}
            submitLabel="Guardar nombre"
            success="Perfil actualizado."
          />
        </div>
      </div>
    </section>
  );
}
