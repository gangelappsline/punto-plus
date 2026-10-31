import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { MenuPage } from '../features/MenuPage';
import { readDB } from '../services/demo';
import { useAuth } from '../stores/auth';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function setup(slug: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/${slug}`]}>
        <Routes>
          <Route path="/:businessSlug" element={<MenuPage />} />
          <Route path="/login" element={<h1>Iniciar sesión</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

describe('Menú digital público por slug', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.getState().clear();
  });

  it('muestra una pantalla clara cuando el slug no corresponde a un negocio', async () => {
    setup('negocio-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos este menú' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hay un negocio con el enlace/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Volver a intentar' })).not.toBeInTheDocument();
  });

  it('muestra el restaurante, banner, categorías y los platillos más pedidos sin sesión', async () => {
    const data = readDB().business;
    setup(slugify(data.name));

    expect(await screen.findByRole('heading', { name: data.name })).toBeInTheDocument();
    expect(screen.getByText('Los más pedidos')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Categorías del menú' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cafetería/ })).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Ver detalles de Capuchino de la casa/ })[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText('Inicia sesión como cliente para agregar platillos a tu orden.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver mi orden/ })).not.toBeInTheDocument();
  });

  it('filtra el catálogo al elegir una categoría y deja buscar platillos', async () => {
    const user = setup(slugify(readDB().business.name));
    await screen.findByRole('heading', { name: 'Café Avellaneda' });

    await user.click(screen.getByRole('button', { name: 'Repostería' }));
    expect(screen.getByRole('heading', { name: 'Repostería' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ver detalles de Pan de elote/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ver detalles de Café americano/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Todos' }));
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar platillos' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar platillos' }), 'vainilla');
    expect(
      screen.getByRole('button', { name: /Ver detalles de Latte de vainilla/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ver detalles de Pan de elote/ }),
    ).not.toBeInTheDocument();
  });

  it('permite consultar los detalles del platillo', async () => {
    const user = setup(slugify(readDB().business.name));
    await screen.findByRole('heading', { name: 'Café Avellaneda' });
    await user.click(screen.getAllByRole('button', { name: /Ver detalles de Café americano/ })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'Espresso doble y agua caliente. Intenso, limpio y recién preparado.',
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('$45.00')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: /Inicia sesión como cliente para ordenar/ }),
    ).toBeInTheDocument();
  });

  it('deja agregar platillos y ajustar cantidades solo a clientes autenticados', async () => {
    useAuth
      .getState()
      .setSession(
        { id: 'client-1', name: 'Ana Cliente', email: 'ana@example.com', role: 'customer' },
        'client-token',
      );
    const user = setup(slugify(readDB().business.name));
    await screen.findByRole('heading', { name: 'Café Avellaneda' });
    await user.click(
      screen.getAllByRole('button', { name: 'Agregar Capuchino de la casa a tu orden' })[0],
    );

    const orderButton = screen.getByRole('button', { name: /Ver mi orden/ });
    expect(orderButton).toHaveTextContent('$55.00');
    await user.click(orderButton);
    const dialog = await screen.findByRole('dialog', { name: 'Tu orden' });
    expect(within(dialog).getByText('Capuchino de la casa')).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: 'Agregar uno de Capuchino de la casa' }),
    );
    expect(within(dialog).getByText('2', { selector: 'span' })).toBeInTheDocument();
    expect(within(dialog).getByText('$110.00')).toBeInTheDocument();
  });

  it('no ofrece agregar a la orden a cuentas que no son clientes', async () => {
    useAuth
      .getState()
      .setSession(
        { id: 'business-1', name: 'Restaurante', email: 'rest@example.com', role: 'business' },
        'business-token',
      );
    const user = setup(slugify(readDB().business.name));
    await screen.findByRole('heading', { name: 'Café Avellaneda' });

    expect(
      screen.queryByRole('button', { name: /Agregar Café americano a tu orden/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /Ver detalles de Café americano/ })[0]);
    expect(
      await screen.findByText('Solo las cuentas de cliente pueden agregar a una orden.'),
    ).toBeInTheDocument();
  });

  it('avisa cuando el menú no existe en lugar de dejar la página en blanco', async () => {
    setup('negocio-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos este menú' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('respeta la configuración que desactiva los pedidos desde el menú', async () => {
    const { updateDB } = await import('../services/demo');
    updateDB((db) => {
      db.business = { ...db.business, allowOrders: false };
    });
    setup('demo');

    expect(
      await screen.findByText('Este negocio no recibe pedidos desde el menú digital.'),
    ).toBeInTheDocument();
    const disabledOrderButtons = screen.getAllByRole('button', {
      name: 'Pedidos no disponibles desde el menú',
    });
    expect(disabledOrderButtons.length).toBeGreaterThan(0);
    expect(disabledOrderButtons[0]).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Ver mi orden/ })).not.toBeInTheDocument();
  });

  it('informa cuando el negocio aún no publica platillos', async () => {
    const { updateDB } = await import('../services/demo');
    updateDB((db) => {
      db.business = { ...db.business, menuItems: [] };
    });
    setup('demo');

    expect(await screen.findByText('Este menú aún no tiene platillos')).toBeInTheDocument();
    expect(
      screen.getByText('El negocio todavía no ha publicado sus productos. Vuelve pronto.'),
    ).toBeInTheDocument();
  });
});
