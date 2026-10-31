import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminCategoriesPage } from '../features/AdminCategoriesPage';
import { readAdminCategories } from '../services/demo';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <AdminCategoriesPage />
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => localStorage.clear());

describe('Administración de categorías', () => {
  it('edita los datos de una categoría y persiste los cambios', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Cafetería' });
    await user.click(screen.getByRole('button', { name: 'Editar Cafetería' }));

    const nameInput = screen.getByRole('textbox', { name: 'Nombre de la categoría' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Café de especialidad');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(readAdminCategories().find((category) => category.id === 'cat-coffee')?.name).toBe(
        'Café de especialidad',
      ),
    );
    expect(
      await screen.findByRole('heading', { name: 'Café de especialidad' }),
    ).toBeInTheDocument();
  });

  it('requiere confirmación antes de eliminar una categoría', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Panadería' });
    await user.click(screen.getByRole('button', { name: 'Eliminar Panadería' }));

    const dialog = await screen.findByRole('dialog', { name: 'Eliminar categoría' });
    expect(
      within(dialog).getByText('¿Seguro que quieres eliminar esta categoría?'),
    ).toBeInTheDocument();
    expect(readAdminCategories().some((category) => category.name === 'Panadería')).toBe(true);

    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() =>
      expect(readAdminCategories().some((category) => category.name === 'Panadería')).toBe(false),
    );
    expect(screen.queryByRole('heading', { name: 'Panadería' })).not.toBeInTheDocument();
  });

  it('valida que se asigne un icono antes de crear una categoría', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Categorías del menú.' });
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la categoría' }), 'Helados');
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sube y guarda un icono');
    expect(readAdminCategories().some((category) => category.name === 'Helados')).toBe(false);
  });
});
