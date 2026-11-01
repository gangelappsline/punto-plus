import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminLayout } from '../features/AdminShell';
import { BusinessLayout } from '../features/BusinessShell';
import { CustomerLayout } from '../features/CustomerShell';

async function verifyMobileDrawer(
  Layout: typeof CustomerLayout | typeof BusinessLayout | typeof AdminLayout,
  path: '/app' | '/business' | '/admin',
) {
  const user = userEvent.setup();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const { container, unmount } = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={`${path}/*`} element={<Layout />}>
            <Route index element={<h1>Panel</h1>} />
            <Route path="*" element={<h1>Sección</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  const sidebar = container.querySelector('aside.sidebar');
  expect(sidebar).not.toHaveClass('mobile-open');
  expect(screen.queryByRole('navigation', { name: 'Navegación móvil' })).not.toBeInTheDocument();

  const openButton = screen.getByRole('button', { name: 'Mostrar opciones del menú' });
  expect(openButton).toHaveAttribute('aria-expanded', 'false');
  await user.click(openButton);
  expect(sidebar).toHaveClass('mobile-open');
  expect(openButton).toHaveAttribute('aria-expanded', 'true');

  const closeButton = container.querySelector<HTMLButtonElement>('.mobile-sidebar-close');
  expect(closeButton).toBeInTheDocument();
  await user.click(closeButton!);
  expect(sidebar).not.toHaveClass('mobile-open');
  expect(openButton).toHaveAttribute('aria-expanded', 'false');
  unmount();
}

describe('Navegación móvil de los paneles', () => {
  it('mantiene cerrado el menú de cliente hasta abrirlo y permite cerrarlo', async () => {
    await verifyMobileDrawer(CustomerLayout, '/app');
  });

  it('mantiene cerrado el menú de negocio hasta abrirlo y permite cerrarlo', async () => {
    await verifyMobileDrawer(BusinessLayout, '/business');
  });

  it('mantiene cerrado el menú de administración hasta abrirlo y permite cerrarlo', async () => {
    await verifyMobileDrawer(AdminLayout, '/admin');
  });
});
