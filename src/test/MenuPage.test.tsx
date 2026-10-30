import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { MenuPage } from '../features/MenuPage';
import { readDB, updateDB } from '../services/demo';

function setup(slug: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/menu/${slug}`]}>
        <Routes>
          <Route path="/menu/:businessId" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Menú digital público', () => {
  beforeEach(() => localStorage.clear());

  it('muestra el negocio, sus categorías, los platos y su QR sin iniciar sesión', async () => {
    const name = readDB().business.name;
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setup(slug);

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByText('Cafetería')).toBeInTheDocument();
    expect(screen.getByText('Capuchino')).toBeInTheDocument();
    expect(screen.getByText('$55')).toBeInTheDocument();
    // El QR apunta al propio menú y se pinta con los colores del negocio.
    const qr = document.querySelector('.menu-qr svg path[fill]');
    expect(qr).not.toBeNull();
    expect(screen.getByText(new RegExp(`/menu/${slug}`))).toBeInTheDocument();
  });

  it('avisa cuando el menú no existe en lugar de dejar la página en blanco', async () => {
    setup('negocio-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'Este menú no está disponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument();
  });

  it('informa cuando el negocio aún no publica platos', async () => {
    updateDB((db) => {
      db.business = { ...db.business, menuItems: [] };
    });
    setup('demo');

    expect(
      await screen.findByText('El menú aún no tiene platos publicados. Vuelve pronto.'),
    ).toBeInTheDocument();
  });
});
