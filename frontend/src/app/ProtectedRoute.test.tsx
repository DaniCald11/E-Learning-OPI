import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import type { Profile } from '../features/auth/session'
function view(profile: Profile | null) {
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } })
  client.setQueryData(['session'], profile)
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin']}><Routes>
    <Route path="/admin" element={<ProtectedRoute role="Admin"><div>Contenido administrativo</div></ProtectedRoute>} />
    <Route path="/login" element={<div>Acceso de usuario</div>} />
  </Routes></MemoryRouter></QueryClientProvider>)
}
describe('Rutas protegidas', () => {
  it('redirige visitantes al acceso', () => { view(null); expect(screen.getByText('Acceso de usuario')).toBeInTheDocument() })
  it('rechaza alumnos en administración', () => { view({ id: '1', email: 'student@example.test', fullName: 'Alumno', roles: ['Student'] }); expect(screen.getByRole('alert')).toHaveTextContent('No tienes permiso') })
  it('permite al administrador', () => { view({ id: '2', email: 'admin@example.test', fullName: 'Admin', roles: ['Admin'] }); expect(screen.getByText('Contenido administrativo')).toBeInTheDocument() })
})
