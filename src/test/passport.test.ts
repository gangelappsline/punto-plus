import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { ApiError as ApiErrorShape } from '../services/http';

/**
 * Estas pruebas corren en modo API contra un Laravel Passport simulado:
 * verifican la petición del password grant y que los tokens queden guardados.
 */
vi.stubEnv('VITE_DATA_MODE', 'api');
vi.stubEnv('VITE_AUTH_LOGIN_MODE', 'passport');
vi.stubEnv('VITE_PASSPORT_CLIENT_ID', 'client-id-123');

vi.resetModules();
const { http, ApiError } = await import('../services/http');
const { login, register, buildRegisterPayload } = await import('../services/auth');
const { AUTH_STORAGE_KEY, readStoredSession } = await import('../lib/tokenStorage');
const { useAuth } = await import('../stores/auth');

const apiMock = new AxiosMockAdapter(http);

const passportResponse = {
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.access',
  refresh_token: 'def50200refresh',
};

beforeEach(() => {
  apiMock.reset();
  localStorage.clear();
  useAuth.getState().clear();
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('Login contra Laravel Passport', () => {
  it('pide el token con el password grant y guarda lo que responde la API', async () => {
    apiMock.onPost('/oauth/token').reply(200, passportResponse);
    apiMock.onGet('/api/me').reply(200, {
      id: 12,
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      role: 'negocio',
    });

    const session = await login({ email: 'ana@example.com', password: 'secreto123' });

    const body = new URLSearchParams(apiMock.history.post[0].data as string);
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('client_id')).toBe('client-id-123');
    expect(body.get('username')).toBe('ana@example.com');
    expect(body.get('password')).toBe('secreto123');
    expect(apiMock.history.post[0].headers?.['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );

    // Passport no devuelve el usuario: se pide con el Bearer recién guardado.
    expect(apiMock.history.get[0].url).toBe('/api/me');
    expect(apiMock.history.get[0].headers?.Authorization).toBe(
      `Bearer ${passportResponse.access_token}`,
    );

    expect(session.accessToken).toBe(passportResponse.access_token);
    expect(session.user).toEqual({
      id: '12',
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      role: 'business',
    });

    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!)).toMatchObject({
      accessToken: passportResponse.access_token,
      refreshToken: 'def50200refresh',
      tokenType: 'Bearer',
      user: { role: 'business' },
    });
    expect(readStoredSession()?.expiresAt).toBeGreaterThan(Date.now());
    expect(useAuth.getState().accessToken).toBe(passportResponse.access_token);
  });

  it('usa el usuario incluido en la respuesta sin pedir /api/me', async () => {
    apiMock.onPost('/oauth/token').reply(200, {
      user: { id: 4, name: 'Sofía', email: 'sofia@example.com', role: 'customer' },
      ...passportResponse,
    });

    const session = await login({ email: 'sofia@example.com', password: 'secreto123' });
    expect(apiMock.history.get).toHaveLength(0);
    expect(session.user?.role).toBe('customer');
  });

  it('traduce las credenciales inválidas de Passport a un mensaje claro', async () => {
    apiMock.onPost('/oauth/token').reply(400, {
      error: 'invalid_credentials',
      message: 'The user credentials were incorrect.',
    });

    await expect(login({ email: 'ana@example.com', password: 'mala' })).rejects.toThrow(
      'Correo o contraseña incorrectos.',
    );
    expect(readStoredSession()).toBeNull();
  });
});

describe('Registro de clientes y negocios', () => {
  it('arma el payload plano del cliente', () => {
    const payload = buildRegisterPayload({
      role: 'customer',
      name: ' Sofía García ',
      email: 'SOFIA@Example.com',
      password: 'punto1234',
      phone: ' 55 1234 5678 ',
    });
    expect(payload).toEqual({
      role: 'customer',
      name: 'Sofía García',
      email: 'sofia@example.com',
      password: 'punto1234',
      password_confirmation: 'punto1234',
      phone: '55 1234 5678',
    });
  });

  it('incluye el bloque business y normaliza el RFC', () => {
    const payload = buildRegisterPayload({
      role: 'business',
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      password: 'avellaneda1',
      business: {
        businessName: 'Café Avellaneda',
        category: 'Cafetería',
        phone: '55 8765 4321',
        address: 'Av. Michoacán 120',
        city: 'Ciudad de México',
        rfc: 'cav190315ab1',
      },
    });
    expect(payload).toMatchObject({
      role: 'business',
      business: { name: 'Café Avellaneda', category: 'Cafetería', rfc: 'CAV190315AB1' },
    });
  });

  it('registra un negocio, guarda la sesión y expone los errores 422 por campo', async () => {
    apiMock.onPost('/api/register').reply(200, {
      user: { id: 9, name: 'Ana Ramírez', email: 'ana@example.com', role: 'business' },
      authorization: passportResponse,
    });

    const session = await register({
      role: 'business',
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      password: 'avellaneda1',
      business: { businessName: 'Café Avellaneda', category: 'Cafetería' },
    });

    expect(apiMock.history.post[0].url).toBe('/api/register');
    expect(session.user?.role).toBe('business');
    expect(readStoredSession()?.accessToken).toBe(passportResponse.access_token);

    apiMock.onPost('/api/register').reply(422, {
      message: 'The given data was invalid.',
      errors: { email: ['El correo ya está registrado.'], 'business.name': ['Campo obligatorio.'] },
    });
    const error = (await register({
      role: 'business',
      name: 'Ana Ramírez',
      email: 'ana@example.com',
      password: 'avellaneda1',
      business: { businessName: 'Café Avellaneda', category: 'Cafetería' },
    }).catch((e: unknown) => e)) as ApiErrorShape;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.fieldErrors).toEqual({
      email: ['El correo ya está registrado.'],
      'business.name': ['Campo obligatorio.'],
    });
  });

  it('inicia sesión automáticamente si el backend no devuelve tokens al registrar', async () => {
    apiMock.onPost('/api/register').reply(201, { message: 'ok' });
    apiMock.onPost('/oauth/token').reply(200, passportResponse);
    apiMock.onGet('/api/me').reply(200, {
      id: 5,
      name: 'Sofía',
      email: 'sofia@example.com',
      role: 'customer',
    });

    const session = await register({
      role: 'customer',
      name: 'Sofía García',
      email: 'sofia@example.com',
      password: 'punto1234',
    });

    expect(apiMock.history.post.map((r) => r.url)).toEqual(['/api/register', '/oauth/token']);
    expect(session.accessToken).toBe(passportResponse.access_token);
  });
});
