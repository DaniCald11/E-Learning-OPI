import { Link as RouterLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, AppBar, Box, Button, Container, Link, Paper, Stack, Toolbar, Typography } from '@mui/material'
import { useState } from 'react'
import { useSession, sessionKey, landing } from '../features/auth/session'
import { mutate, errorMessage } from '../services/api'
import { ProtectedRoute } from './ProtectedRoute'
import { ConfirmPage, ForgotPage, LoginPage, RegisterPage, ResetPage } from '../pages/AuthPages'
import { ProfilePage } from '../pages/ProfilePage'
function Dashboard({ admin = false }: { admin?: boolean }) {
  const { data } = useSession()
  return <Stack spacing={2}><Typography component="h1" variant="h4">{admin ? 'Administración' : 'Mi cuenta'}</Typography>
    <Typography>Hola, {data?.fullName}.</Typography>
    <Link component={RouterLink} to="/perfil">Editar mi perfil</Link></Stack>
}
export default function App() {
  const { data } = useSession(); const query = useQueryClient(); const navigate = useNavigate(); const [error, setError] = useState('')
  return <><AppBar position="static"><Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
    <Typography component={RouterLink} to="/" variant="h6" sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}>E-Learning OPI</Typography>
    {data ? <><Button color="inherit" component={RouterLink} to={landing(data)}>Mi cuenta</Button>
      <Button color="inherit" onClick={async () => {
        try { await mutate('/auth/logout'); query.setQueryData(sessionKey, null); navigate('/login'); setError('') }
        catch (failure) { setError(errorMessage(failure)) }
      }}>Cerrar sesión</Button></> : <Button color="inherit" component={RouterLink} to="/login">Iniciar sesión</Button>}
  </Toolbar></AppBar><Container component="main" maxWidth="sm" sx={{ py: { xs: 3, md: 6 } }}>
    {error && <Alert severity="error">{error}</Alert>}<Paper variant="outlined" sx={{ p: { xs: 2, md: 4 } }}><Box>
      <Routes><Route path="/" element={<Stack spacing={3}><Typography variant="h3" component="h1">Bienvenido</Typography>
        <Typography>Accede a tu cuenta de E-Learning OPI.</Typography><Button component={RouterLink} to={data ? landing(data) : '/registro'} variant="contained">{data ? 'Mi cuenta' : 'Crear cuenta'}</Button></Stack>} />
        <Route path="/login" element={<LoginPage />} /><Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar-contrasena" element={<ForgotPage />} /><Route path="/restablecer-contrasena" element={<ResetPage />} />
        <Route path="/confirmar-correo" element={<ConfirmPage />} />
        <Route path="/alumno/dashboard" element={<ProtectedRoute role="Student"><Dashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="Admin"><Dashboard admin /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Typography component="h1">Página no encontrada</Typography>} />
      </Routes></Box></Paper></Container></>
}
