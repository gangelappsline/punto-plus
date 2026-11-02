import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { api } from '../services/api';
import { readDB } from '../services/demo';

function setup(path = '/app') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

/**
 * Simula el permiso de ubicación del navegador. Devuelve el espía de
 * `getCurrentPosition` para comprobar si la app insiste con el permiso.
 */
function stubGeolocation({
  permission,
  latitude = 19.4326,
  longitude = -99.1332,
}: {
  permission: PermissionState | 'unknown';
  latitude?: number;
  longitude?: number;
}) {
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({
      coords: { latitude, longitude } as GeolocationCoordinates,
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition),
  );
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value:
      permission === 'unknown'
        ? undefined
        : { query: vi.fn().mockResolvedValue({ state: permission }) },
  });
  return getCurrentPosition;
}

describe('Experiencia de cliente', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('en Mis tarjetas consulta únicamente las tarjetas y resalta la sección activa', async () => {
    const cards = vi.spyOn(api, 'cards');
    const promotions = vi.spyOn(api, 'promotions');
    const nearMe = vi.spyOn(api, 'nearMe');
    const activity = vi.spyOn(api, 'activity');
    setup('/app');

    expect(
      await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ }),
    ).toBeInTheDocument();
    expect(cards).toHaveBeenCalledOnce();
    expect(promotions).not.toHaveBeenCalled();
    expect(nearMe).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();

    const tabs = screen.getByRole('navigation', { name: 'Secciones del cliente' });
    expect(within(tabs).getByRole('link', { name: 'Tarjetas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(tabs).getByRole('link', { name: 'Tarjetas' })).toHaveClass('active');
  });

  it('muestra las secciones en orden y permite escanear desde tarjetas', async () => {
    const user = setup();
    const tabs = screen.getByRole('navigation', { name: 'Secciones del cliente' });
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual(['Tarjetas', 'Promociones', 'Cerca de mí']);

    const scanButton = await screen.findByRole('button', {
      name: 'Escanear un negocio participante',
    });
    await user.click(scanButton);
    expect(await screen.findByRole('dialog', { name: 'Escanear un negocio' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ }),
    ).toBeInTheDocument();
    await user.click(within(tabs).getByRole('link', { name: 'Promociones' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: /Promociones para ti/ }),
    ).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Promociones' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('permite al cliente confirmar una compra con el token de venta del negocio', async () => {
    const token = await api.newSaleToken();
    const user = setup();

    await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ });
    await user.click(screen.getByRole('button', { name: 'Confirmar compra' }));
    await user.type(screen.getByLabelText('Código de venta de 8 caracteres'), token.token);
    await user.click(screen.getByRole('button', { name: 'Validar' }));

    expect(await screen.findByRole('heading', { name: 'Verifica el código' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar compra' }));

    expect(await screen.findByRole('heading', { name: '¡Compra confirmada!' })).toBeInTheDocument();
    expect(readDB().saleToken).toBeNull();
    expect(readDB().cards.find((card) => card.id === 'cafe')?.stamps).toBe(7);
  });

  it('Promociones solo consulta /customer/promotions y resalta la pestaña activa', async () => {
    const cards = vi.spyOn(api, 'cards');
    const promotions = vi.spyOn(api, 'promotions');
    const nearMe = vi.spyOn(api, 'nearMe');
    const activity = vi.spyOn(api, 'activity');
    setup('/app/promociones');

    expect(await screen.findByText('Las buenas mañanas son de dos.')).toBeInTheDocument();
    expect(promotions).toHaveBeenCalledOnce();
    expect(cards).not.toHaveBeenCalled();
    expect(nearMe).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();
    expect(
      screen.getByRole('navigation', { name: 'Secciones del cliente' }).querySelector('.active'),
    ).toHaveTextContent('Promociones');
  });

  it('Cerca de mí carga los negocios automáticamente al abrir la sección', async () => {
    const cards = vi.spyOn(api, 'cards');
    const promotions = vi.spyOn(api, 'promotions');
    const nearMe = vi.spyOn(api, 'nearMe');
    const activity = vi.spyOn(api, 'activity');
    stubGeolocation({ permission: 'granted', latitude: 19.4326, longitude: -99.1332 });
    setup('/app/cerca-de-mi');

    expect(
      await screen.findByRole('button', { name: /Ver información de Café Avellaneda/ }),
    ).toBeInTheDocument();
    expect(nearMe).toHaveBeenCalledWith({ latitude: 19.4326, longitude: -99.1332 });
    expect(await screen.findByText('Ubicación activa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activar ubicación' })).not.toBeInTheDocument();
    expect(cards).not.toHaveBeenCalled();
    expect(promotions).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();
  });

  it('no vuelve a solicitar el permiso: usa la ubicación guardada sin preguntar', async () => {
    localStorage.setItem(
      'punto-plus:location',
      JSON.stringify({ latitude: 19.4326, longitude: -99.1332, savedAt: Date.now() }),
    );
    const getCurrentPosition = stubGeolocation({ permission: 'unknown' });
    const nearMe = vi.spyOn(api, 'nearMe');
    setup('/app/cerca-de-mi');

    expect(
      await screen.findByRole('button', { name: /Ver información de Café Avellaneda/ }),
    ).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(nearMe).toHaveBeenCalledWith({ latitude: 19.4326, longitude: -99.1332 });
  });

  it('respeta el permiso negado y no insiste con la ubicación', async () => {
    const getCurrentPosition = stubGeolocation({ permission: 'denied' });
    const nearMe = vi.spyOn(api, 'nearMe');
    setup('/app/cerca-de-mi');

    expect(
      await screen.findByText(/Activa la ubicación en tu navegador para ver negocios cerca/),
    ).toBeInTheDocument();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(nearMe).not.toHaveBeenCalled();
  });

  it('muestra el negocio normalizado con su distancia y logo en la lista del mapa', async () => {
    vi.spyOn(api, 'nearMe').mockResolvedValue([
      {
        id: '45',
        name: 'Taqueria Chayito',
        category: 'Restaurante',
        logo: 'https://example.com/chayito.png',
        latitude: 19.3020916,
        longitude: -104.1540069,
        location: 'Ubicación en mapa',
        distanceKm: 0,
        hasCard: true,
        activeLoyaltyCardsCount: 2,
        activePromotionsCount: 3,
        isActive: true,
      },
    ]);
    stubGeolocation({ permission: 'granted', latitude: 19.3020916, longitude: -104.1540069 });
    const user = setup('/app/cerca-de-mi');

    const business = await screen.findByRole('button', {
      name: 'Ver información de Taqueria Chayito',
    });
    expect(business).toHaveTextContent('Muy cerca');
    expect(business.querySelector('img')).toHaveAttribute('src', 'https://example.com/chayito.png');

    await user.click(business);
    const dialog = await screen.findByRole('dialog', { name: 'Taqueria Chayito' });
    expect(dialog).toHaveTextContent('Muy cerca');
    expect(dialog).toHaveTextContent('Ya tienes su tarjeta');
    expect(dialog).toHaveTextContent('3 promociones');
    expect(within(dialog).getByRole('link', { name: /Abrir ruta/ })).toHaveAttribute(
      'href',
      expect.stringContaining('destination=19.3020916%2C-104.1540069'),
    );
  });

  it('avisa cuando Google Maps no está configurado y deja consultar los negocios', async () => {
    stubGeolocation({ permission: 'granted' });
    setup('/app/cerca-de-mi');

    expect(await screen.findByText(/No pudimos cargar el mapa de Google Maps/)).toBeInTheDocument();
    expect(screen.queryByTitle('Mapa de negocios cercanos')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Ver información de Café Avellaneda' }),
    ).toBeInTheDocument();
  });

  it('abre el modal del negocio desde la lista de negocios cercanos', async () => {
    stubGeolocation({ permission: 'granted', latitude: 19.4326, longitude: -99.1332 });
    const user = setup('/app/cerca-de-mi');

    await user.click(
      await screen.findByRole('button', { name: 'Ver información de Café Avellaneda' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Café Avellaneda' });
    expect(dialog).toHaveTextContent('Calle Colima 168, Roma Norte, CDMX');
    expect(dialog).toHaveTextContent('Cafetería');
  });

  it('filtra tarjetas completas sin consultar otras secciones', async () => {
    const user = setup();
    await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ });
    await user.click(screen.getByRole('button', { name: /Con recompensa/ }));
    expect(screen.getByRole('button', { name: /Ver tarjeta de Matcha/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver tarjeta de Café/ })).not.toBeInTheDocument();
  });

  it('muestra regreso al inicio para una ruta desconocida', () => {
    setup('/no-existe/con-ruta-desconocida');
    expect(screen.getByRole('heading', { name: 'Nos salimos del barrio.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Tarjetas' })).toHaveAttribute('href', '/app');
  });

  it('redirige las secciones retiradas al inicio del perfil del cliente', async () => {
    setup('/app/actividad');
    expect(
      await screen.findByRole('heading', { name: /Tus tarjetas de lealtad/ }),
    ).toBeInTheDocument();
  });
});
