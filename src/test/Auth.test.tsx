import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Login } from '../features/Login';
import { Register } from '../features/Register';
import { AUTH_STORAGE_KEY, readStoredSession } from '../lib/tokenStorage';
import { useAuth } from '../stores/auth';

function setup(ui: React.ReactElement, path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <Toaster />
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={ui} />
          <Route path="/app" element={<h1>Panel de cliente</h1>} />
          <Route path="/admin" element={<h1>Panel de negocio</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

beforeEach(() => {
  localStorage.clear();
  useAuth.getState().clear();
});

describe('Página de inicio de sesión', () => {
  it('valida el correo antes de llamar a la API', async () => {
    const user = setup(<Login />, '/login');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'no-es-un-correo');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: /Entrar a mi comunidad/ }));
    expect(await screen.findByText('Escribe un correo válido')).toBeInTheDocument();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('guarda la sesión devuelta por la API y entra al panel del cliente', async () => {
    const user = setup(<Login />, '/login');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'sofia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await user.click(screen.getByRole('button', { name: /Entrar a mi comunidad/ }));

    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
    const stored = readStoredSession();
    expect(stored?.tokenType).toBe('Bearer');
    expect(stored?.accessToken).toBeTruthy();
    expect(stored?.refreshToken).toBeTruthy();
    expect(stored?.user?.email).toBe('sofia@example.com');
    expect(useAuth.getState().accessToken).toBe(stored?.accessToken);
  });

  it('ofrece el enlace hacia el registro', () => {
    setup(<Login />, '/login');
    expect(screen.getByRole('link', { name: /Crea la tuya en un minuto/ })).toHaveAttribute(
      'href',
      '/registro',
    );
  });
});

describe('Página de registro', () => {
  it('registra un cliente y guarda su sesión', async () => {
    const user = setup(<Register />, '/registro');
    await user.type(screen.getByLabelText('Nombre completo'), 'Sofía García');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'sofia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'punto1234');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'punto1234');
    await user.click(screen.getByText(/Acepto los términos/));
    await user.click(screen.getByRole('button', { name: /Crear mi cuenta/ }));

    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
    expect(readStoredSession()?.user).toMatchObject({
      email: 'sofia@example.com',
      role: 'customer',
    });
  });

  it('pide los mismos campos al elegir cliente o negocio', async () => {
    const user = setup(<Register />, '/registro');
    expect(screen.queryByLabelText('Nombre comercial')).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Tengo un negocio/ }));
    // Los datos del negocio (logo, menú, categorías…) se capturan después de iniciar sesión,
    // no en el formulario de creación de la cuenta.
    expect(screen.queryByLabelText('Nombre comercial')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Categoría')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dirección del local')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/RFC/)).not.toBeInTheDocument();
    expect(await screen.findByLabelText('Teléfono')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar mi negocio/ })).toBeInTheDocument();
  });

  it('registra un negocio con nombre, correo, teléfono y contraseña', async () => {
    const user = setup(<Register />, '/registro');
    await user.click(screen.getByRole('radio', { name: /Tengo un negocio/ }));
    await user.type(await screen.findByLabelText('Nombre del responsable'), 'Ana Ramírez');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@avellaneda.mx');
    await user.type(screen.getByLabelText('Teléfono'), '55 8765 4321');
    await user.type(screen.getByLabelText('Contraseña'), 'avellaneda1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'avellaneda1');
    await user.click(screen.getByText(/Acepto los términos/));
    await user.click(screen.getByRole('button', { name: /Registrar mi negocio/ }));

    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
    expect(readStoredSession()?.user).toMatchObject({
      email: 'ana@avellaneda.mx',
      role: 'business',
    });
  });

  it('bloquea el envío si las contraseñas no coinciden o faltan los términos', async () => {
    const user = setup(<Register />, '/registro');
    await user.type(screen.getByLabelText('Nombre completo'), 'Sofía García');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'sofia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'punto1234');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otracosa1');
    await user.click(screen.getByRole('button', { name: /Crear mi cuenta/ }));

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(
      await screen.findByText('Necesitamos tu aceptación para crear la cuenta'),
    ).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull());
  });

  it('exige los campos requeridos también para una cuenta de negocio', async () => {
    const user = setup(<Register />, '/registro');
    await user.click(screen.getByRole('radio', { name: /Tengo un negocio/ }));
    await user.type(await screen.findByLabelText('Nombre del responsable'), 'Ana Ramírez');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'no-es-un-correo');
    await user.type(screen.getByLabelText('Teléfono'), '55 8765 4321');
    await user.type(screen.getByLabelText('Contraseña'), 'avellaneda1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'avellaneda1');
    await user.click(screen.getByText(/Acepto los términos/));
    await user.click(screen.getByRole('button', { name: /Registrar mi negocio/ }));

    expect(await screen.findByText('Escribe un correo válido')).toBeInTheDocument();
  });

  it('enlaza de vuelta al inicio de sesión', () => {
    setup(<Register />, '/registro');
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login');
  });
});
