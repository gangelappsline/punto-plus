import { test, expect } from '@playwright/test';
test('el dashboard carga imágenes y no desborda la pantalla', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tus favoritos, te dan más.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ver tarjeta de Café Avellaneda/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator('.promotion-grid').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('main img')
        .evaluateAll((imgs) =>
          imgs.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});
test('busca, canjea con confirmación y conserva el historial', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Buscar negocios o tarjetas' }).fill('matcha');
  await expect(page.locator('.loyalty-grid .loyalty-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Ver tarjeta de Matcha/ }).click();
  await page.getByRole('button', { name: 'Canjear mi recompensa' }).click();
  await expect(page.getByText('Canje de demostración. No tiene valor comercial.')).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar canje' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/actividad');
  await expect(
    page.getByRole('heading', { name: 'Canjeaste: Tu matcha favorito gratis' }),
  ).toBeVisible();
});
test('el QR demo del negocio permite agregar una tarjeta', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('button', { name: 'Escanear un negocio' }).click();
  await page.getByRole('button', { name: 'Probar con un QR de demostración' }).click();
  await expect(page.getByRole('dialog', { name: 'Casa Botánica' })).toBeVisible();
  await page.getByRole('button', { name: 'Agregar a mis tarjetas' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Ver tarjeta de Casa Botánica/ })).toBeVisible();
});
test('configura la tarjeta y registra una compra con confirmación', async ({ page }) => {
  await page.goto('/negocio');
  await page.getByLabel('Nombre del negocio', { exact: true }).fill('Café de Sofía');
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByText('La tarjeta de tu negocio se guardó')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar una compra' }).click();
  await page.getByRole('button', { name: 'Probar con un QR de demostración' }).click();
  await page.getByRole('button', { name: 'Confirmar compra y agregar sello' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /Ver tarjeta de Café de Sofía, 7 de 8/ }),
  ).toBeVisible();
});
test('publica y guarda una promoción', async ({ page }) => {
  await page.goto('/negocio');
  await page.getByRole('button', { name: 'Promociones', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva promoción' }).click();
  await page.getByLabel('Título', { exact: true }).fill('Un café para compartir');
  await page
    .getByLabel('Descripción y condiciones')
    .fill('Dos cafés por el precio de uno. Válido de lunes a viernes de 8 a 10 h.');
  await page.getByLabel('Válida hasta').fill('2030-12-31');
  await page.getByRole('button', { name: 'Publicar promoción' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/explorar');
  await page
    .getByRole('textbox', { name: 'Buscar negocios o tarjetas' })
    .fill('Un café para compartir');
  const favorite = page.getByRole('button', { name: 'Guardar en favoritos: Café Avellaneda' });
  await favorite.click();
  await expect(
    page.getByRole('button', { name: 'Quitar de favoritos: Café Avellaneda' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Guardados', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Un café para compartir' })).toBeVisible();
});
