import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { api } from '../services/api';

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

  it('Cerca de mí consulta /customer/near-me sin cargar las otras pestañas', async () => {
    const cards = vi.spyOn(api, 'cards');
    const promotions = vi.spyOn(api, 'promotions');
    const nearMe = vi.spyOn(api, 'nearMe');
    const activity = vi.spyOn(api, 'activity');
    setup('/app/cerca-de-mi');

    expect(
      await screen.findByText(/Configura VITE_GOOGLE_MAPS_API_KEY para cargar el mapa de Google/),
    ).toBeInTheDocument();
    expect(nearMe).toHaveBeenCalledOnce();
    expect(cards).not.toHaveBeenCalled();
    expect(promotions).not.toHaveBeenCalled();
    expect(activity).not.toHaveBeenCalled();
  });

  it('solicita permiso de ubicación solo después de la acción del cliente', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-google-maps-key');
    const position = {
      coords: { latitude: 19.4326, longitude: -99.1332 } as GeolocationCoordinates,
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition;
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    const user = setup('/app/cerca-de-mi');

    expect(await screen.findByTitle('Google Maps: Café Avellaneda')).toHaveAttribute(
      'src',
      expect.stringContaining(
        'https://www.google.com/maps/embed/v1/search?key=test-google-maps-key',
      ),
    );
    expect(getCurrentPosition).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(await screen.findByText(/Ubicación activada/)).toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledOnce();
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
