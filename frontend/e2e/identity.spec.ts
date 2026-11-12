import { test, expect } from '@playwright/test'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
const dataPath = resolve(import.meta.dirname, '../../.data')
async function emailLink(recipient: string, subject: string) {
  const paths = await Promise.all((await readdir(resolve(dataPath, 'mail'))).map(async name => {
    const path = resolve(dataPath, 'mail', name)
    return { path, time: (await stat(path)).mtimeMs }
  }))
  for (const { path } of paths.sort((a, b) => b.time - a.time)) {
    const mail = JSON.parse(await readFile(path, 'utf8'))
    if (mail.recipient === recipient && mail.subject === subject) return mail.body as string
  }
  throw new Error('No se encontró el correo de desarrollo esperado')
}
test('registro, confirmación, acceso, permisos, perfil y recuperación reales', async ({ page }) => {
  const email = `browser-${randomBytes(8).toString('hex')}@example.test`
  const password = 'Aa1!' + randomBytes(16).toString('hex')
  await page.goto('/registro')
  await page.getByLabel('Nombre completo').fill('Alumno Navegador')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Registrarme', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Revisa tu correo')
  await page.goto(await emailLink(email, 'Confirma tu cuenta'))
  await page.getByRole('button', { name: 'Confirmar correo', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Correo confirmado')
  await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click()
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/alumno\/dashboard/)
  await page.goto('/admin')
  await expect(page.getByRole('alert')).toContainText('No tienes permiso')
  await page.goto('/perfil')
  await page.getByLabel('Nombre completo').fill('Nombre Navegador')
  await page.getByRole('button', { name: 'Guardar nombre' }).click()
  await expect(page.getByText('Nombre actual: Nombre Navegador')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Nombre actual: Nombre Navegador')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
  await expect(page.getByRole('heading', { name: 'Recupera tu contraseña' })).toBeVisible()
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByRole('button', { name: 'Enviar instrucciones' }).click()
  await expect(page.getByRole('alert')).toContainText('Si la cuenta existe')
  await page.goto(await emailLink(email, 'Restablece tu contraseña'))
  const updated = 'Bb2!' + randomBytes(16).toString('hex')
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(updated)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Contraseña actualizada')
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(updated)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/alumno\/dashboard/)
})
test('administrador aprovisionado accede a su panel', async ({ page }) => {
  const settings = JSON.parse(await readFile(resolve(dataPath, 'development.json'), 'utf8'))
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(settings.BootstrapAdmin__Email)
  await page.getByLabel('Contraseña', { exact: true }).fill(settings.BootstrapAdmin__Password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Administración' })).toBeVisible()
})
