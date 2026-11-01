import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminBusinessesPage } from '../features/AdminBusinessesPage';
import { readAdminBusinesses } from '../services/demo';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <AdminBusinessesPage />
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => localStorage.clear());

describe('Administración del directorio de negocios', () => {
  it('muestra estados, métricas y membresías desde los datos de demostración', async () => {
    setup();
    expect(
      await screen.findByRole('heading', { level: 1, name: /Directorio de negocios/ }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('326')).not.toHaveLength(0);
    expect(screen.getByText('Clientes nuevos este mes')).toBeInTheDocument();
    expect(screen.getByText('Ingresos de este mes')).toBeInTheDocument();
    expect(screen.getByText('Membresías próximas a vencer')).toBeInTheDocument();
    expect(screen.getAllByText('Café Avellaneda').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('table')).getByText('En incorporación')).toBeInTheDocument();
  });

  it('edita un negocio y persiste su nombre y estado', async () => {
    const user = setup();
    await screen.findAllByText('Café Avellaneda');
    await user.click(screen.getByRole('button', { name: 'Editar Café Avellaneda' }));

    const name = screen.getByRole('textbox', { name: /Nombre del negocio/ });
    await user.clear(name);
    await user.type(name, 'Café Avellaneda Centro');
    await user.selectOptions(screen.getByLabelText('Estado'), 'onboarding');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      const updated = readAdminBusinesses().find(
        (business) => business.id === 'business-cafe-avellaneda',
      );
      expect(updated?.name).toBe('Café Avellaneda Centro');
      expect(updated?.status).toBe('onboarding');
    });
    expect(await screen.findAllByText('Café Avellaneda Centro')).not.toHaveLength(0);
  });

  it('permite crear negocios con cualquiera de los estados definidos', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Directorio de negocios' });
    await user.click(screen.getByRole('button', { name: 'Nuevo negocio' }));
    await user.type(screen.getByRole('textbox', { name: /Nombre del negocio/ }), 'Librería Nube');
    await user.type(screen.getByRole('textbox', { name: 'Correo electrónico' }), 'hola@nube.mx');
    await user.selectOptions(screen.getByLabelText('Estado'), 'pending');
    await user.click(screen.getByRole('button', { name: 'Crear negocio' }));

    await waitFor(() =>
      expect(
        readAdminBusinesses().some(
          (business) => business.name === 'Librería Nube' && business.status === 'pending',
        ),
      ).toBe(true),
    );
    expect(await screen.findByText('Librería Nube')).toBeInTheDocument();
  });

  it('filtra por estado y requiere confirmación antes de eliminar', async () => {
    const user = setup();
    await screen.findAllByText('Café Avellaneda');
    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'pending');
    expect(
      within(screen.getByRole('table')).queryByText('Café Avellaneda'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Casa Botánica')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrar por estado'), 'all');
    await user.click(screen.getByRole('button', { name: 'Eliminar Pan de Barrio' }));
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar negocio' });
    expect(within(dialog).getByText(/¿Seguro que quieres eliminar/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() =>
      expect(readAdminBusinesses().some((business) => business.name === 'Pan de Barrio')).toBe(
        false,
      ),
    );
    expect(screen.queryByText('Pan de Barrio')).not.toBeInTheDocument();
  });
});
