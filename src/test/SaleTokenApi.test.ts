import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Flujo de token de venta', () => {
  it('solicita un token al negocio y normaliza su fecha de expiración', async () => {
    apiMock.onGet('/business/new-token').reply(200, {
      data: { token: 'a7bc29xz', expires_at: '2026-11-01T12:05:00.000Z' },
    });

    const result = await api.newSaleToken();

    expect(apiMock.history.get[0].url).toBe('/business/new-token');
    expect(result).toEqual({ token: 'A7BC29XZ', expiresAt: '2026-11-01T12:05:00.000Z' });
  });

  it('envía el token ingresado por el cliente para validarlo y consumirlo', async () => {
    apiMock.onPost('/customer/validate-token').reply(200, { message: 'Compra verificada.' });

    await api.confirmSaleToken('a7bc29xz');

    expect(apiMock.history.post[0].url).toBe('/customer/validate-token');
    expect(JSON.parse(apiMock.history.post[0].data)).toEqual({ token: 'A7BC29XZ' });
  });

  it('no envía códigos que no tengan 8 caracteres alfanuméricos', async () => {
    await expect(api.confirmSaleToken('BAD-CODE')).rejects.toThrow(
      'código de venta válido de 8 caracteres',
    );
    expect(apiMock.history.post).toHaveLength(0);
  });
});
