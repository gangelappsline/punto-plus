import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { updateDB } from '../services/demo';
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
  it('muestra las tarjetas y filtra por nombre sin distinguir acentos', async () => {
    const user = setup();
    expect(
      await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Buscar negocios o tarjetas' }), 'cafe');
    expect(
      screen.getByRole('button', { name: /Ver tarjeta de Café Avellaneda/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Ver tarjeta de Pan de Barrio/ }),
    ).not.toBeInTheDocument();
  });
  it('presenta las tres pestañas en orden y permite escanear una compra desde tarjetas', async () => {
    const user = setup();
    const tabs = screen.getByRole('navigation', { name: 'Secciones del cliente' });
    expect(
      within(tabs)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual(['Tarjetas', 'Promociones', 'Cerca de mí']);
    const scanButton = await screen.findByRole('button', { name: 'Escanear una nueva compra' });
    expect(scanButton).toBeInTheDocument();
    await user.click(scanButton);
    expect(await screen.findByRole('dialog', { name: 'Escanear una compra' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ }),
    ).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Promociones' })).toHaveAttribute(
      'href',
      '/app/promociones',
    );
  });

  it('limita las promociones a negocios donde el cliente ya registró compras', async () => {
    updateDB((db) => {
      const bakeryCard = db.cards.find((card) => card.businessId === 'b2');
      if (bakeryCard) bakeryCard.stamps = 0;
      db.activity = db.activity.filter((entry) => entry.business !== 'Pan de Barrio');
    });
    setup('/app/promociones');

    expect(await screen.findByText('Las buenas mañanas son de dos.')).toBeInTheDocument();
    expect(screen.queryByText('Un antojo recién horneado.')).not.toBeInTheDocument();
    expect(screen.getByText('Tu ritual, un poquito más verde.')).toBeInTheDocument();
  });

  it('muestra el mapa de Google y solicita permiso de ubicación', async () => {
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
      expect.stringContaining('maps.google.com/maps'),
    );
    await user.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(await screen.findByText(/Ubicación activada/)).toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('solo muestra tarjetas completas al filtrar recompensas', async () => {
    const user = setup();
    await screen.findByRole('button', { name: /Ver tarjeta de Café Avellaneda/ });
    await user.click(screen.getByRole('button', { name: /Con recompensa/ }));
    expect(screen.getByRole('button', { name: /Ver tarjeta de Matcha/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver tarjeta de Café/ })).not.toBeInTheDocument();
  });
  it('muestra el QR demo dentro de un diálogo accesible', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Mi código QR' }));
    expect(screen.getByRole('dialog', { name: 'Una visita más cerca' })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.qr-code svg')).toBeInTheDocument());
    expect(screen.getByText('QR de demostración · sin datos personales')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('requiere confirmación y actualiza las recompensas al canjear', async () => {
    const user = setup('/app/recompensas');
    await user.click(await screen.findByRole('button', { name: /Ver tarjeta de Matcha/ }));
    await user.click(screen.getByRole('button', { name: 'Canjear mi recompensa' }));
    expect(screen.getByText(/Se utilizarán 5 sellos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar canje' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Lo mejor está por llegar')).toBeInTheDocument();
    expect(screen.getByText('Canjeaste: Tu matcha favorito gratis')).toBeInTheDocument();
  });
  it('ofrece regreso al inicio en una ruta desconocida', () => {
    setup('/no-existe/con-ruta-desconocida');
    expect(screen.getByRole('heading', { name: 'Nos salimos del barrio.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Tarjetas' })).toHaveAttribute('href', '/app');
  });
});
