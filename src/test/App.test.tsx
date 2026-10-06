import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';
function setup(path = '/') {
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
    const user = setup('/recompensas');
    await user.click(await screen.findByRole('button', { name: /Ver tarjeta de Matcha/ }));
    await user.click(screen.getByRole('button', { name: 'Canjear mi recompensa' }));
    expect(screen.getByText(/Se utilizarán 5 sellos/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar canje' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Lo mejor está por llegar')).toBeInTheDocument();
    expect(screen.getByText('Canjeaste: Tu matcha favorito gratis')).toBeInTheDocument();
  });
  it('ofrece regreso al inicio en una ruta desconocida', () => {
    setup('/no-existe');
    expect(screen.getByRole('heading', { name: 'Nos salimos del barrio.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mis tarjetas' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
