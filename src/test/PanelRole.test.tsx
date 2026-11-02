import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El rol del cliente llegó a guardarse como `customer` en versiones anteriores.
 * Si el guard no lo reconoce, redirige a la misma ruta en bucle y el panel queda
 * en blanco (el síntoma que reportaron).
 */
vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { PanelGate, GuestOnly } = await import('../features/Guards');
const { useAuth } = await import('../stores/auth');
const { panelAllows, panelPathFor, panelRole } = await import('../lib/utils');
const { saveStoredSession, readStoredSession } = await import('../lib/tokenStorage');

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/app/*"
            element={
              <PanelGate panel="customer">
                <h1>Panel de cliente</h1>
              </PanelGate>
            }
          />
          <Route
            path="/business/*"
            element={
              <PanelGate panel="business">
                <h1>Panel de negocio</h1>
              </PanelGate>
            }
          />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <h1>Iniciar sesión</h1>
              </GuestOnly>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signIn(role: string) {
  useAuth
    .getState()
    .setSession({ id: '1', name: 'Ana', email: 'ana@example.com', role: role as never }, 'token', {
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3_600_000,
    });
}

beforeEach(() => {
  localStorage.clear();
  useAuth.getState().clear();
});

afterAll(() => vi.unstubAllEnvs());

describe('Rol del panel', () => {
  it('reconoce los sinónimos del cliente que puede devolver el backend', () => {
    for (const role of ['client', 'customer', 'cliente', 'user']) {
      expect(panelRole(role)).toBe('customer');
      expect(panelAllows('customer', role)).toBe(true);
      expect(panelPathFor(role)).toBe('/app');
    }
    expect(panelRole('business')).toBe('business');
    expect(panelRole('negocio')).toBe('business');
    expect(panelRole('admin')).toBe('admin');
    expect(panelRole('')).toBeNull();
  });

  it('abre el panel del cliente con un rol legado guardado en la sesión', async () => {
    signIn('customer');
    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Panel de cliente' })).toBeInTheDocument();
  });

  it('normaliza el rol al recuperar una sesión guardada', () => {
    saveStoredSession({
      accessToken: 'token',
      refreshToken: 'refresh',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 3_600_000,
      scope: null,
      user: { id: '1', name: 'Ana', email: 'ana@example.com', role: 'customer' as never },
      storedAt: Date.now(),
    });

    expect(readStoredSession()?.user?.role).toBe('client');
  });

  it('manda a un negocio a su propio panel sin bucles', async () => {
    signIn('negocio');
    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Panel de negocio' })).toBeInTheDocument();
  });
});
