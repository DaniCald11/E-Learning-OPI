import { useQueryClient } from '@tanstack/react-query'
import { Stack, Typography } from '@mui/material'
import { AuthForm } from '../components/AuthForm'
import { profileSchema } from '../features/auth/schemas'
import { sessionKey, useSession } from '../features/auth/session'
import { mutate } from '../services/api'
export function ProfilePage() {
  const { data } = useSession(); const query = useQueryClient()
  return <Stack spacing={3}><Typography>{data?.email}</Typography>
    <Typography>Nombre actual: {data?.fullName}</Typography>
    <AuthForm title="Mi perfil" schema={profileSchema} fields={[{ name: 'fullName', label: 'Nombre completo', autoComplete: 'name' }]}
      onSubmit={async values => { await mutate('/users/me', values, 'patch'); await query.invalidateQueries({ queryKey: sessionKey }) }}
      submitLabel="Guardar nombre" success="Perfil actualizado." /></Stack>
}
