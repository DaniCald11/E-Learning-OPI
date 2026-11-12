import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AuthForm } from './AuthForm'
import { emailSchema } from '../features/auth/schemas'
describe('Formulario de recuperación', () => {
  it('envía el correo escrito mediante el campo Material UI', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<AuthForm title="Recuperar" schema={emailSchema} fields={[{ name: 'email', label: 'Correo', type: 'email' }]} onSubmit={submit} success="Instrucciones enviadas" />)
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'student@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ email: 'student@example.test' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Instrucciones enviadas')
  })
  it('rechaza un correo inválido antes de enviar', async () => {
    const submit = vi.fn()
    render(<AuthForm title="Recuperar" schema={emailSchema} fields={[{ name: 'email', label: 'Correo', type: 'email' }]} onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Escribe un correo válido.')).toBeVisible()
    expect(submit).not.toHaveBeenCalled()
  })
})
