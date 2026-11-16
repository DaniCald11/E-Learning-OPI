import { test, expect } from '@playwright/test';
test('admin distingue ordenar contenido, cargar PDF y crear taller', async ({ page }) => {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/users/me') ? { id: 'admin-test', email: 'admin@example.test', fullName: 'Administrador de prueba', roles: ['Admin'] }
      : path.endsWith('/admin/media') ? [{ id: '11111111-1111-1111-1111-111111111111', originalFileName: 'ventas.jpg', contentType: 'image/jpeg', sizeBytes: 100, folder: '', processingStatus: 'Ready' }] : [];
    await route.fulfill({ json: data });
  });
  await page.goto('/admin/cursos/nuevo');
  await page.getByRole('tab', { name: 'Temas y contenido' }).click();
  await page.getByRole('button', { name: '+ Agregar tema', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mover arriba', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '+ Agregar módulo', exact: true }).click();
  await page.getByRole('button', { name: '+ Agregar lección', exact: true }).click();
  await page.getByLabel('Tipo de contenido').click();
  await page.getByRole('option', { name: 'Documento', exact: true }).click();
  await page.getByLabel('Materiales de biblioteca').click();
  await page.getByRole('option', { name: 'ventas.jpg', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Falta un PDF.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Subir archivos a la biblioteca', exact: false })).toHaveAttribute('target', '_blank');
  await page.getByRole('link', { name: 'Formaciones y talleres', exact: true }).click();
  await page.getByRole('link', { name: 'Nuevo taller', exact: true }).click();
  await expect(page.getByLabel('Tipo de formación', { exact: true })).toHaveText('Taller');
});
