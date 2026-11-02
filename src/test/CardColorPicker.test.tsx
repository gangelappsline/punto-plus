import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';

function setup(path = '/business/negocio') {
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

describe('Configuración de colores de la tarjeta del negocio', () => {
  it('muestra la paleta agrupada por familias y los selectores de color', async () => {
    setup();

    expect(await screen.findByRole('group', { name: 'Color de fondo' })).toBeInTheDocument();
    for (const family of ['Marca Punto Plus', 'Azules', 'Verdes', 'Cálidos', 'Oscuros', 'Claros']) {
      expect(screen.getByText(family)).toBeInTheDocument();
    }

    expect(screen.getByRole('button', { name: 'Bosque' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Azul marino' })).toBeInTheDocument();

    const colors = screen.getByRole('group', { name: 'Colores de la tarjeta' });
    expect(within(colors).getByLabelText('Color del texto')).toBeInTheDocument();
    expect(within(colors).getByLabelText('Color del sello')).toBeInTheDocument();
    expect(within(colors).getByLabelText('Color del icono del sello')).toBeInTheDocument();
  });

  it('al elegir un tono de la paleta actualiza fondo, texto y color del icono del sello', async () => {
    const user = setup();

    await user.click(await screen.findByRole('button', { name: 'Azul marino' }));

    const colors = screen.getByRole('group', { name: 'Colores de la tarjeta' });
    expect(within(colors).getByLabelText('Color del texto')).toHaveValue('#f6faff');
    expect(within(colors).getByLabelText('Color del icono del sello')).toHaveValue('#1f4771');
    expect(within(colors).getByLabelText('Color del sello')).toHaveValue('#e4ecf5');
    expect(screen.getByRole('button', { name: 'Azul marino' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('permite elegir un fondo personalizado fuera de la paleta', async () => {
    setup();

    const custom = await screen.findByLabelText('Color de fondo personalizado');
    fireEvent.change(custom, { target: { value: '#123456' } });

    const colors = screen.getByRole('group', { name: 'Colores de la tarjeta' });
    expect(within(colors).getByLabelText('Color del texto')).toHaveValue('#f1f5f8');
    expect(screen.getByText('#123456')).toBeInTheDocument();
  });
});
