import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Link, Stack, Typography } from '@mui/material'
import { AuthForm } from '../components/AuthForm'
import { emailSchema, loginSchema, registerSchema, resetSchema } from '../features/auth/schemas'
import { fetchProfile, landing, sessionKey } from '../features/auth/session'
import { errorMessage, mutate } from '../services/api'
const emailField = { name: 'email' as const, label: 'Correo electrónico', type: 'email', autoComplete: 'email' }
export function LoginPage() {
  const query = useQueryClient(); const navigate = useNavigate()
  return <Stack spacing={3}><AuthForm title="Inicia sesión" schema={loginSchema}
    fields={[emailField, { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'current-password' }]}
    submitLabel="Entrar" onSubmit={async data => {
      await mutate('/auth/login', data)
      const profile = await fetchProfile(); query.setQueryData(sessionKey, profile)
      if (profile) navigate(landing(profile), { replace: true })
    }} /><Link component={RouterLink} to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
    <Link component={RouterLink} to="/registro">Crear cuenta</Link></Stack>
}
export function RegisterPage() {
  return <AuthForm title="Crea tu cuenta" schema={registerSchema}
    fields={[{ name: 'fullName', label: 'Nombre completo', autoComplete: 'name' }, emailField,
      { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'new-password' }]}
    onSubmit={async data => { await mutate('/auth/register', data) }} submitLabel="Registrarme"
    success="Revisa tu correo para confirmar tu cuenta antes de iniciar sesión." />
}
export function ForgotPage() {
  return <AuthForm title="Recupera tu contraseña" schema={emailSchema} fields={[emailField]}
    onSubmit={async data => { await mutate('/auth/forgot-password', data) }} submitLabel="Enviar instrucciones"
    success="Si la cuenta existe y está confirmada, recibirás instrucciones." />
}
export function ResetPage() {
  const [params] = useSearchParams()
  if (!params.get('token') || !params.get('email')) return <Alert severity="error">El enlace está incompleto.</Alert>
  return <AuthForm title="Nueva contraseña" schema={resetSchema}
    fields={[{ name: 'password', label: 'Nueva contraseña', type: 'password', autoComplete: 'new-password' }]}
    onSubmit={async data => { await mutate('/auth/reset-password', { ...data, email: params.get('email'), token: params.get('token') }) }}
    success="Contraseña actualizada. Ya puedes iniciar sesión." />
}
export function ConfirmPage() {
  const [params] = useSearchParams(); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  return <Stack spacing={3}><Typography component="h1" variant="h4">Confirma tu correo</Typography>
    {message && <Alert severity="success">{message}</Alert>}{error && <Alert severity="error">{error}</Alert>}
    <Button variant="contained" disabled={busy || Boolean(message)} onClick={async () => {
      setBusy(true); setError('')
      try { await mutate('/auth/confirm-email', { userId: params.get('userId'), token: params.get('token') }); setMessage('Correo confirmado. Ya puedes iniciar sesión.') }
      catch (failure) { setError(errorMessage(failure)) } finally { setBusy(false) }
    }}>Confirmar correo</Button><Link component={RouterLink} to="/login">Ir a iniciar sesión</Link></Stack>
}
