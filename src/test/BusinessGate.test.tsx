import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QRCodeStyling from 'qr-code-styling';
import { BusinessPage } from '../features/BusinessPage';
import { readDB, updateDB } from '../services/demo';

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/business/negocio']}>
        <BusinessPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setOnboarded(onboarded: boolean) {
  updateDB((db) => {
    db.business = { ...db.business, onboarded };
  });
}

describe('Guarda de alta del negocio en /business/negocio', () => {
  beforeEach(() => localStorage.clear());

  it('muestra el acceso a Mi menú cuando el perfil aún no está completo', async () => {
    setOnboarded(false);
    setup();

    expect(
      await screen.findByRole('heading', { name: 'Completa la configuración de tu negocio' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Abrir Mi menú/ })).toHaveAttribute(
      'href',
      '/business/mi-menu',
    );
    expect(screen.queryByRole('button', { name: /Guardar configuración/ })).not.toBeInTheDocument();
  });

  it('muestra el editor de la tarjeta cuando el negocio ya está configurado', async () => {
    setOnboarded(true);
    setup();

    expect(
      await screen.findByRole('button', { name: /Guardar configuración/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Unos pasos y listo' })).not.toBeInTheDocument();
    expect(readDB().business.onboarded).toBe(true);
  });

  it('permite guardar colores del QR y ofrece descargas en PNG y WebP', async () => {
    const user = userEvent.setup();
    setOnboarded(true);
    setup();
    await screen.findByRole('button', { name: /Guardar configuración/ });

    await user.click(screen.getByRole('button', { name: /Código QR/ }));
    expect(await screen.findByTitle('Código QR del menú de Café Avellaneda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar PNG/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar WebP/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Color del código QR'), {
      target: { value: '#123456' },
    });
    await user.click(screen.getByRole('button', { name: /Guardar configuración/ }));

    await waitFor(() => expect(readDB().business.qrForeground).toBe('#123456'));
  });

  it('parte de negro sobre blanco y guarda las opciones de diseño del QR', async () => {
    const user = userEvent.setup();
    setOnboarded(true);
    setup();
    await screen.findByRole('button', { name: /Guardar configuración/ });
    await user.click(screen.getByRole('button', { name: /Código QR/ }));

    expect(screen.getByLabelText('Color del código QR')).toHaveValue('#000000');
    expect(screen.getByLabelText('Color de fondo del QR')).toHaveValue('#ffffff');
    expect(screen.getByLabelText('Seleccionar logo para el QR')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Contenido del QR'));
    await user.type(screen.getByLabelText('Contenido del QR'), 'https://ejemplo.test/menu');
    await user.click(
      within(screen.getByRole('group', { name: 'Forma del cuerpo' })).getByRole('button', {
        name: 'Puntos',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Forma del marco del ojo' })).getByRole('button', {
        name: 'Redondeado',
      }),
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Forma del ojo' })).getByRole('button', {
        name: 'Punto',
      }),
    );
    fireEvent.change(screen.getByLabelText('Resolución del QR'), { target: { value: '1024' } });
    await user.click(screen.getByRole('button', { name: /Guardar configuración/ }));

    await waitFor(() => {
      expect(readDB().business).toMatchObject({
        qrContent: 'https://ejemplo.test/menu',
        qrBodyStyle: 'dots',
        qrEyeFrameStyle: 'rounded',
        qrEyeStyle: 'dot',
        qrSize: 1024,
      });
    });
  });

  it('descarga el código QR en PNG, SVG, WebP y JPG con la resolución configurada', async () => {
    const user = userEvent.setup();
    const download = vi.spyOn(QRCodeStyling.prototype, 'download').mockResolvedValue();
    setOnboarded(true);
    setup();
    await screen.findByRole('button', { name: /Guardar configuración/ });
    await user.click(screen.getByRole('button', { name: /Código QR/ }));
    await screen.findByTitle('Código QR del menú de Café Avellaneda');

    await user.click(screen.getByRole('button', { name: /Descargar PNG/ }));
    await user.click(screen.getByRole('button', { name: 'SVG' }));
    await user.click(screen.getByRole('button', { name: /Descargar WebP/ }));
    await user.click(screen.getByRole('button', { name: 'JPG' }));

    await waitFor(() => {
      expect(download).toHaveBeenNthCalledWith(1, {
        name: 'caf-avellaneda-qr',
        extension: 'png',
      });
      expect(download).toHaveBeenNthCalledWith(2, {
        name: 'caf-avellaneda-qr',
        extension: 'svg',
      });
      expect(download).toHaveBeenNthCalledWith(3, {
        name: 'caf-avellaneda-qr',
        extension: 'webp',
      });
      expect(download).toHaveBeenNthCalledWith(4, {
        name: 'caf-avellaneda-qr',
        extension: 'jpeg',
      });
    });
    download.mockRestore();
  });

  it('conserva el acceso a compras y promociones mientras falta el perfil', async () => {
    setOnboarded(false);
    setup();

    await screen.findByRole('heading', { name: 'Completa la configuración de tu negocio' });
    // Registrar una compra y las promociones siguen disponibles fuera de la guarda.
    expect(screen.getByRole('button', { name: /Registrar una compra/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Promociones/ })).toBeInTheDocument();
  });
});

describe('Formulario de promoción del negocio', () => {
  beforeEach(() => localStorage.clear());

  async function openPromotionForm() {
    const user = userEvent.setup();
    setOnboarded(true);
    setup();
    await screen.findByRole('button', { name: /Guardar configuración/ });
    await user.click(screen.getByRole('button', { name: /Promociones/ }));
    await user.click(await screen.findByRole('button', { name: /Nueva promoción/ }));
    await screen.findByLabelText('Tipo de promoción');
    return user;
  }

  it('muestra los campos del tipo elegido al cambiar el selector', async () => {
    const user = await openPromotionForm();
    const type = screen.getByLabelText('Tipo de promoción');

    // Por defecto es directa: no hay campos de compras ni de niveles.
    expect(screen.getByLabelText('Siempre activa')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Después de cuántas compras/)).not.toBeInTheDocument();

    await user.selectOptions(type, 'simple');
    expect(await screen.findByLabelText(/Después de cuántas compras/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Producto gratis/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Siempre activa')).not.toBeInTheDocument();

    await user.selectOptions(type, 'steps');
    expect(await screen.findByPlaceholderText('Puntos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar nivel/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Después de cuántas compras/)).not.toBeInTheDocument();
  });

  it('publica una promoción directa con los valores por defecto del formulario', async () => {
    const user = await openPromotionForm();

    await user.type(screen.getByLabelText('Título'), 'Un café para compartir');
    await user.type(
      screen.getByLabelText('Descripción y condiciones'),
      'Dos cafés por el precio de uno. Válido de lunes a viernes de 8 a 10 h.',
    );
    // `<input type="date">` sanitiza cada pulsación, así que se asigna el valor completo.
    fireEvent.change(screen.getByLabelText('Válida hasta'), {
      target: { value: '2030-12-31' },
    });
    await user.click(screen.getByRole('button', { name: /Publicar promoción/ }));

    // Regresión: la fila de niveles arranca con el beneficio vacío y eso no debe
    // impedir publicar una promoción de otro tipo (el diálogo se quedaba abierto).
    await waitFor(() => expect(readDB().promotions[0]?.title).toBe('Un café para compartir'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const saved = readDB().promotions[0];
    expect(saved.type).toBe('direct');
    expect(saved.appliesAlways).toBe(true);
    // Solo viajan las condiciones del tipo elegido.
    expect(saved.tiers).toBeUndefined();
    expect(saved.purchasesRequired).toBeUndefined();
    expect(saved.weekdays).toBeUndefined();
  });

  it('revela los días y horarios de una promoción directa no permanente', async () => {
    const user = await openPromotionForm();

    expect(screen.queryByRole('button', { name: 'Jue' })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Siempre activa'));
    expect(await screen.findByRole('button', { name: 'Jue' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();

    // Marcar un día debe reflejarse en el estado del botón.
    const thursday = screen.getByRole('button', { name: 'Jue' });
    expect(thursday).toHaveAttribute('aria-pressed', 'false');
    await user.click(thursday);
    expect(thursday).toHaveAttribute('aria-pressed', 'true');
  });
});
