import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessPage } from '../features/BusinessPage';
import { readDB, updateDB } from '../services/demo';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/negocio']}>
        <BusinessPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setOnboarded(onboarded: boolean) {
  updateDB((db) => {
    db.business = { ...db.business, onboarded };
  });
}

describe('Guarda de alta del negocio en /admin/negocio', () => {
  beforeEach(() => localStorage.clear());

  it('muestra el asistente por pasos cuando el perfil aún no está completo', async () => {
    setOnboarded(false);
    setup();

    expect(await screen.findByRole('heading', { name: 'Unos pasos y listo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sube tu logo' })).toBeInTheDocument();
    // El editor de la tarjeta no aparece hasta terminar el asistente.
    expect(screen.queryByRole('button', { name: /Guardar configuración/ })).not.toBeInTheDocument();
  });

  it('muestra el editor de la tarjeta cuando el negocio ya está configurado', async () => {
    setOnboarded(true);
    setup();

    expect(
      await screen.findByRole('button', { name: /Guardar configuración/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Unos pasos y listo' })).not.toBeInTheDocument();
    expect(readDB().business.onboarded).toBe(true);
  });

  it('conserva el acceso a compras y promociones mientras falta el perfil', async () => {
    setOnboarded(false);
    setup();

    await screen.findByRole('heading', { name: 'Unos pasos y listo' });
    // Registrar una compra y las promociones siguen disponibles fuera de la guarda.
    expect(screen.getByRole('button', { name: /Registrar una compra/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Promociones/ })).toBeInTheDocument();
  });
});

describe('Formulario de promoción del negocio', () => {
  beforeEach(() => localStorage.clear());

  async function openPromotionForm() {
    const user = userEvent.setup();
    setOnboarded(true);
    setup();
    await screen.findByRole('button', { name: /Guardar configuración/ });
    await user.click(screen.getByRole('button', { name: /Promociones/ }));
    await user.click(await screen.findByRole('button', { name: /Nueva promoción/ }));
    await screen.findByLabelText('Tipo de promoción');
    return user;
  }

  it('muestra los campos del tipo elegido al cambiar el selector', async () => {
    const user = await openPromotionForm();
    const type = screen.getByLabelText('Tipo de promoción');

    // Por defecto es directa: no hay campos de compras ni de niveles.
    expect(screen.getByLabelText('Siempre activa')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Después de cuántas compras/)).not.toBeInTheDocument();

    await user.selectOptions(type, 'simple');
    expect(await screen.findByLabelText(/Después de cuántas compras/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producto gratis/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Siempre activa')).not.toBeInTheDocument();

    await user.selectOptions(type, 'steps');
    expect(await screen.findByPlaceholderText('Puntos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar nivel/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Después de cuántas compras/)).not.toBeInTheDocument();
  });

  it('revela los días y horarios de una promoción directa no permanente', async () => {
    const user = await openPromotionForm();

    expect(screen.queryByRole('button', { name: 'Jue' })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Siempre activa'));
    expect(await screen.findByRole('button', { name: 'Jue' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();

    // Marcar un día debe reflejarse en el estado del botón.
    const thursday = screen.getByRole('button', { name: 'Jue' });
    expect(thursday).toHaveAttribute('aria-pressed', 'false');
    await user.click(thursday);
    expect(thursday).toHaveAttribute('aria-pressed', 'true');
  });
});
