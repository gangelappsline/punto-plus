import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Acceso a los paneles en modo API: solo se entra con el token guardado al
 * iniciar sesión y al panel que corresponde al rol.
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
const { PanelGate, GuestOnly } = await import('../features/Guards');
const { http } = await import('../services/http');
const { useAuth } = await import('../stores/auth');
const { readStoredSession } = await import('../lib/tokenStorage');

// `services/http` crea dos instancias: la de la API y la exclusiva del refresh.
const apiMock = new AxiosMockAdapter(http);
const refreshMock = new AxiosMockAdapter(createSpy.mock.results[1].value as AxiosInstance);
const profile = { id: 7, name: 'Ana Ramírez', email: 'ana@example.com', role: 'business' };
type Role = 'customer' | 'business';

function Pane({ label }: { label: string }) {
  const location = useLocation();
  return (
    <>
      <h1>{label}</h1>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="state">{(location.state as { from?: string } | null)?.from ?? '—'}</span>
    </>
  );
}

function renderAt(path: string, state?: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Pane label="Iniciar sesión" />
              </GuestOnly>
            }
          />
          <Route
            path="/app/*"
            element={
              <PanelGate panel="customer">
                <Pane label="Panel de cliente" />
              </PanelGate>
            }
          />
          <Route
            path="/admin/*"
            element={
              <PanelGate panel="business">
                <Pane label="Panel de negocio" />
              </PanelGate>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Sesión guardada como la deja el login: token vigente y usuario. */
function signIn(role: Role, expired = false) {
  useAuth
    .getState()
    .setSession({ id: '1', name: 'Ana', email: 'ana@example.com', role }, 'access-token', {
      refreshToken: 'refresh-token',
      expiresAt: expired ? Date.now() - 1_000 : Date.now() + 3_600_000,
    });
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

describe('Acceso a los paneles', () => {
  it('sin token manda al login y recuerda la ruta pedida', async () => {
    renderAt('/app/actividad');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.getByTestId('state')).toHaveTextContent('/app/actividad');
  });

  it('abre el panel de cliente solo con una sesión de cliente', async () => {
    signIn('customer');
    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
  });

  it('abre el panel de negocio solo con una sesión de negocio', async () => {
    signIn('business');
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
  });

  it('envía a cada cuenta a su propio panel si pide el otro', async () => {
    signIn('customer');
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/app');
  });

  it('devuelve al panel propio cuando ya hay sesión iniciada', async () => {
    signIn('business');
    renderAt('/login');
    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
  });

  it('vuelve a la ruta pedida cuando corresponde a su rol', async () => {
    signIn('customer');
    renderAt('/login', { from: '/app' });
    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
  });

  it('pide el perfil a la API cuando la sesión no lo trae', async () => {
    // Caso real de Passport: se guardó el token pero el usuario llegó después.
    useAuth.getState().setTokens({ access_token: 'access-token', refresh_token: 'refresh' });
    apiMock.onGet('/api/me').reply(200, profile);

    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
    expect(useAuth.getState().user).toMatchObject({ role: 'business' });
    expect(readStoredSession()?.user?.email).toBe('ana@example.com');
  });

  it('cierra la sesión y vuelve al login si la API rechaza el token', async () => {
    useAuth.getState().setTokens({ access_token: 'access-token', refresh_token: 'refresh' });
    apiMock.onGet('/api/me').reply(401, { message: 'Unauthenticated.' });
    refreshMock.onPost(/.*/).reply(401, { message: 'Invalid refresh token.' });

    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    await waitFor(() => expect(useAuth.getState().accessToken).toBeNull());
  });

  it('no deja entrar a un panel con el token vencido y sin refresh', async () => {
    useAuth
      .getState()
      .setSession(
        { id: '1', name: 'Ana', email: 'ana@example.com', role: 'customer' },
        'access-token',
        { expiresAt: Date.now() - 1_000 },
      );

    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(useAuth.getState().accessToken).toBeNull();
  });
});
