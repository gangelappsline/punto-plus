import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { MenuBuilder } from '../features/MenuBuilder';
import { MenuPage } from '../features/MenuPage';
import {
  applyBusinessType,
  builderSaves,
  builderStateFromConfig,
  builderStepError,
  builderToConfig,
  builderWhatsAppLink,
  businessTypes,
  emptyBuilderState,
  seedCatalog,
} from '../lib/menuBuilder';
import { businessSchema, publicMenuSchema } from '../lib/types';
import { readDB, updateDB } from '../services/demo';

function setupBuilder() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/business/crear']}>
        <Routes>
          <Route path="/business/crear" element={<MenuBuilder />} />
          <Route path="/business/mi-menu" element={<h1>Mi menú</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

beforeEach(() => {
  localStorage.clear();
});

describe('Creador de menús: catálogo y conversión', () => {
  it('cada giro trae secciones, productos y precios de ejemplo', () => {
    expect(businessTypes.length).toBeGreaterThanOrEqual(10);
    for (const type of businessTypes) {
      expect(type.categories.length).toBeGreaterThan(0);
      for (const category of type.categories) {
        expect(category.items.length).toBeGreaterThan(0);
        for (const item of category.items) {
          expect(item.name.length).toBeGreaterThan(1);
          expect(item.price).toBeGreaterThan(0);
        }
      }
    }
    // «Otro» permite armar el catálogo desde cero sin quedarse sin secciones.
    expect(businessTypes.some((type) => type.id === 'otro')).toBe(true);
  });

  it('sembrar un giro genera productos del banco y respeta lo que escribió el negocio', () => {
    const seeded = seedCatalog('tacos');
    expect(seeded.categories).toContain('Tacos');
    expect(seeded.items.every((item) => item.source === 'bank')).toBe(true);

    let state = applyBusinessType(emptyBuilderState(), 'tacos');
    state = {
      ...state,
      items: [
        ...state.items,
        {
          id: 'custom-1',
          name: 'Taco de canasta',
          price: '18',
          description: '',
          category: 'Tacos',
          popular: false,
          stock: null,
          isNew: true,
          source: 'custom',
        },
      ],
    };
    const changed = applyBusinessType(state, 'pizzas');
    expect(changed.categories).toContain('Pizzas');
    // El producto propio sobrevive si su sección sigue existiendo.
    expect(changed.items.some((item) => item.name === 'Taco de canasta')).toBe(false);
    expect(changed.items.every((item) => item.source === 'bank')).toBe(true);
  });

  it('convierte el borrador en configuración válida y en los pasos del PUT', () => {
    let state = applyBusinessType(emptyBuilderState(), 'hamburguesas');
    state = {
      ...state,
      name: 'Burger Lab',
      whatsapp: '52 55 1234 5678',
      orderModes: ['pickup', 'delivery'],
      deliveryFee: '35',
      promo: { enabled: true, text: 'Combo burger + papas', price: '99', note: 'Todos los días' },
    };
    const current = readDB().business;
    const config = businessSchema.parse(builderToConfig(current, state));
    expect(config.name).toBe('Burger Lab');
    expect(config.categories).toContain('Hamburguesas');
    expect(config.menuItems.length).toBe(state.items.length);
    expect(config.deliveryAvailable).toBe(true);
    expect(config.menuPromo?.price).toBe('99');
    expect(config.orderModes).toEqual(['pickup', 'delivery']);

    const saves = builderSaves(config);
    expect(saves.map((save) => save.step)).toEqual([
      'information',
      'categories',
      'products',
      'design',
      'service',
    ]);
    const products = saves[2].data.products as Record<string, unknown>[];
    expect(products[0]).toHaveProperty('price');
    expect(products[0]).toHaveProperty('category_id');
    const service = saves[4].data as Record<string, unknown>;
    expect(service.order_modes).toEqual(['pickup', 'delivery']);
    expect(service.menu_promo).toMatchObject({ text: 'Combo burger + papas' });
  });

  it('marca los errores de cada paso antes de publicar', () => {
    const empty = emptyBuilderState();
    expect(builderStepError(empty, 0)).toMatch(/Elige qué vendes/);
    expect(
      builderStepError({ ...empty, typeId: 'tacos', items: seedCatalog('tacos').items }, 1),
    ).toMatch(/categoría/);

    const state = applyBusinessType(emptyBuilderState(), 'tacos');
    expect(builderStepError({ ...state, items: [{ ...state.items[0], price: '' }] }, 1)).toMatch(
      /nombre y precio/,
    );
    expect(builderStepError({ ...state, items: [] }, 1)).toMatch(/al menos un producto/);

    expect(builderStepError({ ...state, name: 'Taquería', serviceDays: [] }, 2)).toMatch(
      /día de servicio/,
    );
    expect(
      builderStepError(
        { ...state, name: 'Taquería', openingTime: '22:00', closingTime: '09:00' },
        2,
      ),
    ).toMatch(/horario/);
    expect(builderStepError({ ...state, name: 'Taquería' }, 2)).toBe('');
    // El diseño no exige nada: cualquier plantilla es válida.
    expect(builderStepError({ ...state, name: 'Taquería' }, 3)).toBe('');
    expect(builderStepError({ ...state, name: 'Taquería', orderModes: [] }, 4)).toMatch(
      /forma de entrega/,
    );
    expect(
      builderStepError(
        { ...state, name: 'Taquería', promo: { enabled: true, text: '', price: '', note: '' } },
        4,
      ),
    ).toMatch(/promoción/);
  });

  it('arma el enlace de WhatsApp con el teléfono limpio', () => {
    const link = builderWhatsAppLink('+52 729 875 5283', 'Tacos El Güero');
    expect(link.startsWith('https://wa.me/527298755283?text=')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Tacos El Güero');
  });

  it('reconstruye el borrador desde la configuración guardada', () => {
    updateDB((db) => {
      db.business = {
        ...db.business,
        businessType: 'Taquería',
        orderModes: ['pickup', 'dinein'],
        paymentMethods: ['Efectivo'],
        deliveryFee: undefined,
        menuPromo: { text: 'Martes 3×2', price: '36' },
      };
    });
    const state = builderStateFromConfig(readDB().business);
    expect(state.typeId).toBe('tacos');
    expect(state.orderModes).toEqual(['pickup', 'dinein']);
    expect(state.promo).toMatchObject({ enabled: true, text: 'Martes 3×2' });
    expect(state.items.length).toBe(readDB().business.menuItems.length);
  });
});

describe('Creador de menús: pantalla', () => {
  it('muestra los cinco pasos y el giro arma el menú al primer toque', async () => {
    const user = setupBuilder();
    const steps = await screen.findByRole('list', { name: 'Pasos del creador de menús' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('group', { name: 'Giro del negocio' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pizzería' }));

    // Pasa a productos y la vista previa ya tiene secciones y platillos.
    const preview = await screen.findByTestId('builder-preview');
    expect(within(preview).getAllByText('Pizzas').length).toBeGreaterThan(0);
    expect(within(preview).getAllByText('Margarita').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Nombre de Margarita')).toHaveValue('Margarita');
  });

  it('permite editar precios, marcar destacados y agregar productos', async () => {
    const user = setupBuilder();
    await screen.findByRole('group', { name: 'Giro del negocio' });
    await user.click(screen.getByRole('button', { name: 'Taquería' }));

    const price = screen.getByLabelText('Precio de Pastor');
    await user.clear(price);
    await user.type(price, '27');
    expect(screen.getAllByText('$27').length).toBeGreaterThan(0);

    // Destacar un producto lo deja marcado para «Lo más pedido».
    await user.click(screen.getByRole('button', { name: 'Marcar Bistec como lo más pedido' }));
    expect(
      screen.getByRole('button', { name: 'Marcar Bistec como lo más pedido' }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Se puede crear una sección nueva sin salir del paso.
    await user.type(screen.getByLabelText('Nombre de la nueva sección'), 'Salsas');
    await user.click(screen.getByRole('button', { name: 'Agregar sección' }));
    expect(screen.getByRole('button', { name: /^Salsas/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getAllByRole('button', { name: 'Tacos' }).at(-1)!);

    await user.click(screen.getByRole('button', { name: 'Agregar producto a Tacos' }));
    const name = screen.getByLabelText('Nombre de el producto');
    await user.type(name, 'Taco dorado');
    await user.type(screen.getByLabelText('Precio de Taco dorado'), '26');
    expect(
      within(screen.getByTestId('builder-preview')).getAllByText('Taco dorado').length,
    ).toBeGreaterThan(0);
  });

  it('recorre los pasos, publica y muestra el enlace con su QR', async () => {
    const user = setupBuilder();
    await screen.findByRole('group', { name: 'Giro del negocio' });
    await user.click(screen.getByRole('button', { name: 'Taquería' }));

    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    const name = await screen.findByPlaceholderText('Tacos El Güero');
    await user.clear(name);
    await user.type(name, 'Tacos El Güero');
    const phone = screen.getByPlaceholderText('52 729 875 5283');
    await user.clear(phone);
    await user.type(phone, '527298755283');
    const address = screen.getByPlaceholderText('Av. Morelos 214, Centro');
    await user.clear(address);
    await user.type(address, 'Av. Morelos 214');

    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    await user.click(screen.getByRole('button', { name: 'Estilo Zen' }));

    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    // El demo ya trae «para llevar» y «a domicilio»: se suma «en el local».
    expect(screen.getByLabelText('A domicilio')).toBeChecked();
    await user.click(screen.getByLabelText('En el local'));
    // «Efectivo» y «Transferencia» ya venían marcados: se suma «Tarjeta».
    await user.click(screen.getByRole('button', { name: 'Tarjeta' }));

    await user.click(screen.getByRole('button', { name: /Publicar mi menú/ }));

    expect(await screen.findByText('¡Tacos El Güero ya tiene menú digital!')).toBeInTheDocument();
    expect(screen.getByLabelText('Código QR de tu menú')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver mi menú/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/tacos-el-guero$/),
    );

    const saved = readDB().business;
    expect(saved.name).toBe('Tacos El Güero');
    expect(saved.categories).toContain('Tacos');
    expect(saved.menuItems.some((item) => item.name === 'Pastor')).toBe(true);
    expect(saved.menuSurface).toBe('dark');
    expect(saved.deliveryAvailable).toBe(true);
    expect(saved.orderModes).toEqual(expect.arrayContaining(['pickup', 'delivery', 'dinein']));
    expect(saved.paymentMethods).toEqual(
      expect.arrayContaining(['Efectivo', 'Transferencia', 'Tarjeta']),
    );
  });

  it('no deja avanzar sin nombre de negocio y avisa del paso que falta', async () => {
    const user = setupBuilder();
    await screen.findByRole('group', { name: 'Giro del negocio' });
    await user.click(screen.getByRole('button', { name: 'Otro' }));

    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    const name = await screen.findByPlaceholderText('Tacos El Güero');
    // El negocio del demo ya tiene nombre: se borra para probar la validación.
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    // Sin nombre no se avanza: el paso sigue abierto en «Tu negocio».
    // El paso sigue abierto: el campo de nombre permanece y no hay estilos que elegir.
    expect(screen.getByPlaceholderText('Tacos El Güero')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Estilos de menú' })).not.toBeInTheDocument();

    await user.type(name, 'Antojitos');
    await user.click(screen.getByRole('button', { name: /Continuar/ }));
    expect(screen.getByRole('group', { name: 'Estilos de menú' })).toBeInTheDocument();
  });
});

describe('Menú público: promoción, existencias y pedidos por WhatsApp', () => {
  it('muestra la promoción, el aviso de existencias y los canales de entrega', async () => {
    updateDB((db) => {
      db.business = {
        ...db.business,
        menuPromo: { text: 'Solo los martes: 3 tacos', price: '36', note: 'Paga 2, llévate 3' },
        orderModes: ['pickup', 'delivery'],
        paymentMethods: ['Efectivo', 'Transferencia'],
        deliveryFee: '35',
        phone: '527298755283',
        menuItems: [{ ...db.business.menuItems[0], stock: 4, isNew: true }],
      };
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/${slugify(readDB().business.name)}`]}>
          <Routes>
            <Route path="/:businessSlug" element={<MenuPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const promo = await screen.findByRole('region', { name: 'Promoción del menú' });
    expect(within(promo).getByText('Solo los martes: 3 tacos')).toBeInTheDocument();
    expect(within(promo).getByText('$36')).toBeInTheDocument();

    expect(screen.getAllByText('Quedan 4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NUEVO').length).toBeGreaterThan(0);

    const channels = screen.getByLabelText('Entrega y formas de pago');
    expect(within(channels).getByText(/A domicilio · \$35/)).toBeInTheDocument();
    expect(within(channels).getByText('Transferencia')).toBeInTheDocument();
    const whatsapp = screen.getByRole('link', { name: /Pedir por WhatsApp/ });
    expect(whatsapp).toHaveAttribute('href', expect.stringContaining('wa.me/527298755283'));
  });

  it('el menú público acepta los campos nuevos del creador sin romperse', () => {
    const parsed = publicMenuSchema.parse({
      name: 'Café Avellaneda',
      categories: ['Cafetería'],
      menuItems: [{ id: 'm1', name: 'Café', price: 45, stock: 3, isNew: true }],
      menuPromo: { text: '2×1 en cafés', price: '45' },
      orderModes: ['pickup'],
      paymentMethods: ['Efectivo'],
      deliveryFee: '30',
      businessType: 'Cafetería',
    });
    expect(parsed.menuItems[0].stock).toBe(3);
    expect(parsed.menuPromo?.text).toBe('2×1 en cafés');
    expect(parsed.orderModes).toEqual(['pickup']);
  });
});
