import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessMenuWizard } from '../features/BusinessMenuWizard';
import { readDB, updateDB } from '../services/demo';

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <BusinessMenuWizard />
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => {
  localStorage.clear();
});

describe('Configurador Mi menú', () => {
  it('muestra el formulario por pasos aunque el perfil llegue vacío', async () => {
    updateDB((db) => {
      db.business = {
        ...db.business,
        name: '',
        logo: undefined,
        banner: undefined,
        categories: [],
        menuItems: [],
      };
    });
    setup();

    expect(await screen.findByRole('heading', { name: 'Mi menú' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre del negocio' })).toHaveValue('');
    expect(screen.getByRole('button', { name: /Categorías/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Productos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Servicio/ })).toBeInTheDocument();
  });

  it('guarda el borrador del negocio al avanzar a otro paso', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Mi menú' });
    const name = screen.getByRole('textbox', { name: 'Nombre del negocio' });
    await user.clear(name);
    await user.type(name, 'Café Guardado');

    await user.click(screen.getByRole('button', { name: /Categorías/ }));

    expect(await screen.findByText(/Selecciona las categorías habilitadas/)).toBeInTheDocument();
    expect(readDB().business.name).toBe('Café Guardado');
    expect(screen.getByRole('status')).toHaveTextContent('Borrador guardado');
  });

  it('ofrece seis tipografías y guarda el estilo elegido para el menú público', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Mi menú' });
    await user.click(screen.getByRole('button', { name: /Diseño/ }));

    const font = await screen.findByLabelText('Tipografía');
    expect(font.querySelectorAll('option')).toHaveLength(6);
    await user.selectOptions(font, 'outfit');
    await user.click(screen.getByRole('button', { name: /Servicio/ }));

    expect(await screen.findByText('Días de servicio')).toBeInTheDocument();
    expect(readDB().business.fontFamily).toBe('outfit');
  });

  it('muestra las categorías en cajas verticales y permite alternar su selección', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Mi menú' });
    await user.click(screen.getByRole('button', { name: /Categorías/ }));

    const category = await screen.findByRole('button', { name: 'Cafetería' });
    expect(category).toHaveAttribute('aria-pressed', 'true');
    expect(category).toHaveClass('flex-col', 'items-center', 'justify-center');

    await user.click(category);
    expect(category).toHaveAttribute('aria-pressed', 'false');
    await user.click(category);
    expect(category).toHaveAttribute('aria-pressed', 'true');
  });

  it('permite ordenar las categorías para el menú público y guarda ese orden', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Mi menú' });
    await user.click(screen.getByRole('button', { name: /Categorías/ }));

    expect(await screen.findByText('Orden en el menú público')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bajar categoría Cafetería' }));
    await user.click(screen.getByRole('button', { name: /Productos/ }));

    expect(readDB().business.categories).toEqual(['Bebidas calientes', 'Cafetería', 'Repostería']);
  });

  it('muestra los cinco pasos y actualiza la vista previa al editar el negocio', async () => {
    const user = setup();
    expect(await screen.findByRole('heading', { name: 'Mi menú' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Café Avellaneda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Información/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Categorías/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Productos/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diseño/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Servicio/ })).toBeInTheDocument();

    const name = screen.getByLabelText('Nombre del negocio');
    await user.clear(name);
    await user.type(name, 'Café Nuevo');
    expect(screen.getByRole('heading', { name: 'Café Nuevo' })).toBeInTheDocument();
  });

  it('permite administrar platillos por categoría y guardar la configuración de servicio', async () => {
    const user = setup();
    await screen.findByRole('heading', { name: 'Mi menú' });
    await user.click(screen.getByRole('button', { name: /Productos/ }));
    expect(screen.getByLabelText('Categoría activa')).toHaveValue('Cafetería');
    expect(screen.getByDisplayValue('Café americano')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Servicio/ }));
    expect(screen.getByText('Días de servicio')).toBeInTheDocument();
    const sunday = screen.getByRole('button', { name: /^Dom$/ });
    expect(sunday).toHaveAttribute('aria-pressed', 'false');
    await user.click(sunday);
    expect(sunday).toHaveAttribute('aria-pressed', 'true');
    expect(sunday).toHaveClass('bg-emerald-700', 'text-white');
    await user.click(screen.getByRole('button', { name: /Guardar mi menú/ }));

    expect(readDB().business.serviceDays).toContain(0);
    expect(readDB().business.allowOrders).toBe(true);
  });
});
