import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTH_STORAGE_KEY,
  authorizationHeader,
  clearStoredSession,
  extractUser,
  isTokenExpired,
  normalizeTokenResponse,
  normalizeRole,
  readStoredSession,
  saveAuthTokens,
  saveStoredSession,
} from '../lib/tokenStorage';
import { useAuth } from '../stores/auth';

const NOW = Date.parse('2026-10-07T12:00:00Z');

/** Respuesta exacta de Laravel Passport en `POST /oauth/token` (password grant). */
const passportResponse = {
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.access',
  refresh_token: 'def50200refresh',
};

beforeEach(() => {
  localStorage.clear();
  useAuth.getState().clear();
});

describe('Almacenamiento de los tokens de la API', () => {
  it('normaliza la respuesta de Passport y calcula la expiración', () => {
    const tokens = normalizeTokenResponse(passportResponse, NOW);
    expect(tokens).toEqual({
      accessToken: passportResponse.access_token,
      refreshToken: 'def50200refresh',
      tokenType: 'Bearer',
      expiresAt: NOW + 3600 * 1000,
      scope: null,
    });
  });

  it('acepta respuestas envueltas y en camelCase', () => {
    const wrapped = normalizeTokenResponse(
      { user: { id: 7, name: 'Ana', email: 'ana@example.com' }, authorization: passportResponse },
      NOW,
    );
    expect(wrapped.accessToken).toBe(passportResponse.access_token);
    const camel = normalizeTokenResponse({ accessToken: 'abc', refreshToken: 'r1' }, NOW);
    expect(camel.accessToken).toBe('abc');
    expect(camel.refreshToken).toBe('r1');
    expect(camel.tokenType).toBe('Bearer');
    expect(camel.expiresAt).toBeNull();
  });

  it('rechaza respuestas sin access token', () => {
    expect(() => normalizeTokenResponse({ message: 'ok' }, NOW)).toThrow(
      'no incluye un access token',
    );
  });

  it('guarda en localStorage todo lo que devuelve la API', () => {
    const session = saveAuthTokens(
      passportResponse,
      { id: '12', name: 'Ana Ramírez', email: 'ana@example.com', role: 'business' },
      NOW,
    );
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({
      accessToken: passportResponse.access_token,
      refreshToken: 'def50200refresh',
      tokenType: 'Bearer',
      expiresAt: NOW + 3600 * 1000,
      user: { email: 'ana@example.com', role: 'business' },
    });
    expect(readStoredSession()).toEqual(session);
    expect(authorizationHeader(session.accessToken)).toBe(
      `Bearer ${passportResponse.access_token}`,
    );
  });

  it('conserva el refresh token cuando la respuesta solo trae uno nuevo de acceso', () => {
    saveAuthTokens(passportResponse);
    const refreshed = saveAuthTokens({
      token_type: 'Bearer',
      access_token: 'nuevo',
      expires_in: 60,
    });
    expect(refreshed.accessToken).toBe('nuevo');
    expect(refreshed.refreshToken).toBe('def50200refresh');
    expect(refreshed.expiresAt).toBeGreaterThan(Date.now());
  });

  it('descarta almacenamiento corrupto en lugar de interpretar basura', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{no-es-json');
    expect(readStoredSession()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(readStoredSession()).toBeNull();
  });

  it('marca el token como vencido antes de tiempo con el margen de tolerancia', () => {
    const session = saveStoredSession({
      accessToken: 'a',
      refreshToken: null,
      tokenType: 'Bearer',
      expiresAt: NOW + 10_000,
      scope: null,
      user: null,
      storedAt: NOW,
    });
    expect(isTokenExpired(session, NOW)).toBe(true);
    expect(isTokenExpired({ ...session, expiresAt: NOW + 600_000 }, NOW)).toBe(false);
    expect(isTokenExpired({ ...session, expiresAt: null }, NOW)).toBe(false);
  });

  it('limpia la sesión guardada', () => {
    saveAuthTokens(passportResponse);
    clearStoredSession();
    expect(readStoredSession()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});

describe('Traducción del usuario y rol del backend', () => {
  it('extrae el usuario incluido en la respuesta de login', () => {
    const user = extractUser({
      user: { id: 7, name: 'Ana Ramírez', email: 'ana@example.com', role: 'negocio' },
      ...passportResponse,
    });
    expect(user).toEqual({
      id: '7',
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      role: 'business',
    });
    expect(extractUser(passportResponse)).toBeNull();
  });

  it('mapea los roles del backend al vocabulario de la app', () => {
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('merchant')).toBe('business');
    expect(normalizeRole('cliente')).toBe('customer');
    expect(normalizeRole(undefined)).toBe('customer');
  });
});

describe('Sesión en el store', () => {
  it('guarda la sesión y la repone al recargar', () => {
    const session = useAuth.getState().saveSession(passportResponse, {
      id: '3',
      name: 'Sofía',
      email: 'sofia@example.com',
      role: 'customer',
    });
    expect(useAuth.getState().accessToken).toBe(session.accessToken);
    expect(useAuth.getState().refreshToken).toBe('def50200refresh');

    useAuth.setState({ user: null, accessToken: null, refreshToken: null, expiresAt: null });
    const hydrated = useAuth.getState().hydrate();
    expect(hydrated?.user?.email).toBe('sofia@example.com');
    expect(useAuth.getState().accessToken).toBe(session.accessToken);
  });

  it('rota los tokens tras un refresh de Passport sin perder el usuario', () => {
    useAuth.getState().saveSession(passportResponse, {
      id: '3',
      name: 'Sofía',
      email: 'sofia@example.com',
      role: 'customer',
    });
    const rotated = useAuth.getState().setTokens({
      token_type: 'Bearer',
      expires_in: 3600,
      access_token: 'access-2',
      refresh_token: 'refresh-2',
    });
    expect(rotated?.accessToken).toBe('access-2');
    expect(useAuth.getState().refreshToken).toBe('refresh-2');
    expect(useAuth.getState().user?.email).toBe('sofia@example.com');
    expect(readStoredSession()?.accessToken).toBe('access-2');
  });

  it('borra tokens y usuario al cerrar sesión', () => {
    useAuth.getState().saveSession(passportResponse);
    useAuth.getState().clear();
    expect(useAuth.getState().accessToken).toBeNull();
    expect(readStoredSession()).toBeNull();
  });
});
