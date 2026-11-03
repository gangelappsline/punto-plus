import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { businessSlug } from '../lib/utils';
import { readDB } from '../services/demo';

function setup(path: string) {
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

const business = () => readDB().business;
const home = () => `/menu/${businessSlug(readDB().business.name)}`;

describe('Menú público editorial · /menu/<slug>', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('abre el menú del negocio con su nombre, categorías y platillos', async () => {
    setup(home());

    expect(await screen.findByRole('heading', { name: business().name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Categorías/i })).toBeInTheDocument();
    expect(screen.getAllByText('Repostería').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Ver todo/i })).toHaveAttribute(
      'href',
      `${home()}/menu`,
    );
  });

  it('muestra la carta completa con búsqueda y filtro por categoría', async () => {
    const user = setup(`${home()}/menu`);

    expect(
      await screen.findByRole('heading', { name: `La carta de ${business().name}` }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar platillos' }), 'matcha');

    await waitFor(() => expect(screen.getByText('Matcha frío')).toBeInTheDocument());
    expect(screen.queryByText('Café americano')).not.toBeInTheDocument();
  });

  it('filtra por categoría desde la URL de la categoría', async () => {
    setup(`${home()}/categoria/reposteria`);

    expect(
      await screen.findByRole('heading', { name: 'Repostería · Café Avellaneda' }),
    ).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByText('Pan de elote')).toBeInTheDocument();
    expect(within(main).queryByText('Café americano')).not.toBeInTheDocument();
  });

  it('abre la ficha del platillo y permite agregarlo al pedido', async () => {
    const user = setup(`${home()}/platillo/pan-de-elote`);

    expect(await screen.findByRole('heading', { name: 'Pan de elote' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar uno' }));
    await user.click(screen.getByRole('button', { name: /Agregar al pedido/ }));

    expect(screen.getByText(/Se agregaron 2 piezas a tu pedido/)).toBeInTheDocument();
    const bar = screen.getByRole('button', { name: /Ver mi pedido/ });
    expect(bar).toHaveTextContent('$76.00');
  });

  it('arma el carrito, elige entrega y enlaza el pedido a WhatsApp', async () => {
    const user = setup(home());

    await screen.findByRole('heading', { name: business().name });
    const addButtons = await screen.findAllByRole('button', { name: /^Agregar .* al pedido$/ });
    await user.click(addButtons[0]);

    // El botón abre la hoja del platillo con cantidad y notas.
    const sheet = await screen.findByRole('dialog');
    await user.click(within(sheet).getByRole('button', { name: /^Agregar al pedido/ }));

    await user.click(await screen.findByRole('button', { name: /Ver mi pedido/ }));
    expect(await screen.findByRole('heading', { name: 'Tu pedido' })).toBeInTheDocument();
    expect(screen.getByText('Subtotal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /A domicilio/ }));
    expect(screen.getByText('Envío')).toBeInTheDocument();
    // Café americano $45 + envío $35 configurado por el negocio.
    expect(screen.getAllByText('$80.00').length).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('Tu nombre (opcional)'), 'Ana');
    const send = screen.getByRole('link', { name: /Enviar pedido por WhatsApp/ });
    const href = send.getAttribute('href') ?? '';
    expect(href).toContain('https://wa.me/527298755283');
    expect(decodeURIComponent(href)).toContain('Total:');
    expect(decodeURIComponent(href)).toContain('Ana');
    expect(decodeURIComponent(href)).toContain('A domicilio');
  });

  it('respeta el carrito guardado del negocio al recargar', async () => {
    localStorage.setItem(
      'punto-plus-public-cart-v1:demo',
      JSON.stringify({ m1: { quantity: 3, note: 'Sin azúcar' } }),
    );
    const user = setup('/menu/demo');

    await screen.findByRole('heading', { name: business().name });
    await user.click(screen.getByRole('button', { name: /Ver mi pedido/ }));

    const dialog = await screen.findByRole('heading', { name: 'Tu pedido' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sin azúcar')).toBeInTheDocument();
  });

  it('avisa cuando el enlace no corresponde a un negocio', async () => {
    setup('/menu/negocio-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'No encontramos este menú' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hay un negocio con el enlace/)).toBeInTheDocument();
  });

  it('explica que el negocio no recibe pedidos desde el menú', async () => {
    const { updateDB } = await import('../services/demo');
    updateDB((db) => {
      db.business = { ...db.business, allowOrders: false };
    });
    setup(home());

    await screen.findByRole('heading', { name: business().name });
    expect(screen.getByText(/Arma tu pedido y envíalo directo a WhatsApp/)).toBeInTheDocument();
    expect(screen.getByText('Pedidos cerrados por ahora')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Agregar .* al pedido$/ }),
    ).not.toBeInTheDocument();
  });
});
