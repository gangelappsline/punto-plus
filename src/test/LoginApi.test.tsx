import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El formulario de inicio de sesión contra la API real (modo `api`): envía las
 * credenciales, guarda el token que responde el backend y entra al panel que
 * corresponde al rol.
 */
// El entorno se fija aquí para que el `.env` local de cada quien no altere el resultado.
vi.stubEnv('VITE_DATA_MODE', 'api');
vi.stubEnv('VITE_AUTH_LOGIN_MODE', 'json');
vi.stubEnv('VITE_AUTH_LOGIN_PATH', '/api/login');
vi.stubEnv('VITE_AUTH_REFRESH_PATH', '/api/refresh');
vi.stubEnv('VITE_AUTH_PROFILE_PATH', '/api/me');

vi.resetModules();
const axios = (await import('axios')).default;
const createSpy = vi.spyOn(axios, 'create');
const { Login } = await import('../features/Login');
const { http } = await import('../services/http');
const { useAuth } = await import('../stores/auth');
const { readStoredSession } = await import('../lib/tokenStorage');

const apiMock = new AxiosMockAdapter(http);
const refreshMock = new AxiosMockAdapter(createSpy.mock.results[1].value as AxiosInstance);

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/app" element={<h1>Panel de cliente</h1>} />
          <Route path="/admin" element={<h1>Panel de negocio</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return user;
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@avellaneda.mx');
  await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
  await user.click(screen.getByRole('button', { name: /Entrar a mi comunidad/ }));
}

beforeEach(() => {
  apiMock.reset();
  refreshMock.reset();
  localStorage.clear();
  useAuth.getState().clear();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('Login contra la API', () => {
  it('envía las credenciales y guarda la sesión devuelta por el backend', async () => {
    const user = setup();
    apiMock.onPost('/api/login').reply(200, {
      user: { id: 7, name: 'Ana Ramírez', email: 'ana@avellaneda.mx', role: 'business' },
      access_token: 'eyJ.access',
      refresh_token: 'def50200refresh',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    await submit(user);

    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
    const request = apiMock.history.post[0];
    expect(request.url).toBe('/api/login');
    expect(JSON.parse(request.data)).toMatchObject({
      email: 'ana@avellaneda.mx',
      password: 'secreto123',
    });

    const stored = readStoredSession();
    expect(stored?.accessToken).toBe('eyJ.access');
    expect(stored?.refreshToken).toBe('def50200refresh');
    expect(stored?.user?.role).toBe('business');
    expect(useAuth.getState().accessToken).toBe('eyJ.access');
  });

  it('pide el perfil cuando el backend solo responde los tokens', async () => {
    const user = setup();
    apiMock.onPost('/api/login').reply(200, {
      access_token: 'eyJ.access',
      refresh_token: 'def50200refresh',
      token_type: 'Bearer',
      expires_in: 3600,
    });
    apiMock.onGet('/api/me').reply(200, {
      id: 9,
      name: 'Sofía García',
      email: 'sofia@example.com',
      role: 'customer',
    });

    await submit(user);

    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
    expect(apiMock.history.get[0].headers?.Authorization).toBe('Bearer eyJ.access');
    expect(readStoredSession()?.user).toMatchObject({ role: 'customer' });
  });

  it('muestra el error de credenciales de la API sin intentar un refresh', async () => {
    const user = setup();
    apiMock.onPost('/api/login').reply(401, { message: 'Correo o contraseña incorrectos.' });

    await submit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(refreshMock.history.post).toHaveLength(0);
    expect(readStoredSession()).toBeNull();
    await waitFor(() => expect(useAuth.getState().accessToken).toBeNull());
  });
});
