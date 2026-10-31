import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { readDB } from '../services/demo';
import { BusinessOnboarding } from '../features/BusinessOnboarding';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/business/onboarding']}>
        <Routes>
          <Route path="/business/onboarding" element={<BusinessOnboarding />} />
          {/* Al publicar, el asistente redirige aquí. */}
          <Route path="/business/negocio" element={<h1>Mi negocio</h1>} />
          <Route path="/business" element={<h1>Panel de negocio</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

/** Recorre logo → banner → nombre → categorías → menú → colores y se detiene en la promoción. */
async function reachPromotionStep(user: ReturnType<typeof userEvent.setup>) {
  const next = () => user.click(screen.getByRole('button', { name: /Siguiente/ }));

  // Paso 1: logo. Un archivo inválido no detiene el flujo (colores de marca de respaldo).
  await user.upload(document.querySelector('input[type="file"]')!, [
    new File(['no-es-una-imagen'], 'logo.png', { type: 'image/png' }),
  ]);
  await next();

  // Paso 2: banner (opcional), se salta.
  await next();

  // Paso 3: nombre del negocio.
  await user.type(screen.getByPlaceholderText(/Ej\. Café Avellaneda/), 'Café Test');
  await next();

  // Paso 4: categorías de comida.
  await user.click(screen.getByRole('button', { name: 'Cafetería' }));
  await next();

  // Paso 5: menú (borrador generado a partir de las categorías).
  expect(screen.getByDisplayValue('Café americano')).toBeInTheDocument();
  await next();

  // Paso 6: colores del menú y el QR.
  await next();
}

describe('Asistente de configuración del negocio', () => {
  it('recorre todos los pasos y publica el negocio con menú, colores y promoción', async () => {
    const user = setup();

    expect(screen.getByRole('heading', { name: /Unos pasos y listo/ })).toBeInTheDocument();

    await reachPromotionStep(user);

    // Paso 7: promoción sencilla.
    await user.click(screen.getByRole('button', { name: /^Sencilla/ }));
    const purchasesInput = screen.getByLabelText(/Después de cuántas compras se gana/);
    await user.clear(purchasesInput);
    await user.type(purchasesInput, '5');
    await user.type(screen.getByLabelText(/Producto gratis/), 'Café americano');
    await user.click(screen.getByRole('button', { name: /Guardar y publicar/ }));

    // Paso 8: resumen y publicación.
    await expect(
      screen.findByRole('heading', { name: /Resumen antes de publicar/ }),
    ).resolves.toBeInTheDocument();
    expect(screen.getByText('Café Test')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Publicar mi negocio/ }));

    // Al publicar guarda el perfil y devuelve al negocio a su panel.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mi negocio' })).toBeInTheDocument(),
    );

    const business = readDB().business;
    expect(business.onboarded).toBe(true);
    expect(business.name).toBe('Café Test');
    expect(business.categories).toContain('Cafetería');
    expect(business.menuItems.map((i) => i.name)).toContain('Café americano');
    expect(business.primaryColor).toBe('#2399A0');
    const promotion = readDB().promotions[0];
    expect(promotion.title).toBe('Promoción de bienvenida');
    expect(promotion.type).toBe('simple');
    expect(promotion.purchasesRequired).toBe(5);
    expect(promotion.freeProduct).toBe('Café americano');
  });

  it('publica una promoción por pasos con los niveles editados', async () => {
    const user = setup();
    await reachPromotionStep(user);

    await user.click(screen.getByRole('button', { name: /^Por pasos/ }));

    // Editar el nivel inicial: los puntos y el beneficio deben conservarse como arreglo.
    const points = screen.getByLabelText('Puntos mínimos');
    await user.clear(points);
    await user.type(points, '20');
    await user.type(screen.getByLabelText('Beneficio al alcanzar los puntos'), 'Postre gratis');

    // Agregar un segundo nivel.
    await user.click(screen.getByRole('button', { name: /Agregar nivel/ }));
    const allPoints = screen.getAllByLabelText('Puntos mínimos');
    await user.clear(allPoints[1]);
    await user.type(allPoints[1], '40');
    const allBenefits = screen.getAllByLabelText('Beneficio al alcanzar los puntos');
    await user.type(allBenefits[1], 'Desayuno completo');

    await user.click(screen.getByRole('button', { name: /Guardar y publicar/ }));
    await user.click(await screen.findByRole('button', { name: /Publicar mi negocio/ }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Mi negocio' })).toBeInTheDocument(),
    );

    const promotion = readDB().promotions[0];
    expect(promotion.type).toBe('steps');
    expect(Array.isArray(promotion.tiers)).toBe(true);
    expect(promotion.tiers).toEqual([
      { points: 20, benefit: 'Postre gratis' },
      { points: 40, benefit: 'Desayuno completo' },
    ]);
  });

  it('muestra el error de cada nivel incompleto en lugar de bloquearse en silencio', async () => {
    const user = setup();
    await reachPromotionStep(user);

    await user.click(screen.getByRole('button', { name: /^Por pasos/ }));
    // Sin capturar el beneficio del nivel: el asistente debe decirlo en pantalla.
    await user.click(screen.getByRole('button', { name: /Guardar y publicar/ }));

    expect(await screen.findByText('Describe el beneficio.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /Resumen antes de publicar/ }),
    ).not.toBeInTheDocument();
  });

  it('no avanza si faltan datos obligatorios en un paso', async () => {
    const user = setup();

    await user.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(
      await screen.findByText('Sube el logo de tu negocio para continuar.'),
    ).toBeInTheDocument();
  });
});
