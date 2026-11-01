import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('API de negocios cercanos', () => {
  it('envía latitud y longitud como parámetros de /customer/near-me', async () => {
    const coordinates = { latitude: 19.4326, longitude: -99.1332 };
    apiMock.onGet('/customer/near-me').reply(200, []);

    await api.nearMe(coordinates);

    expect(apiMock.history.get).toHaveLength(1);
    expect(apiMock.history.get[0].url).toBe('/customer/near-me');
    expect(apiMock.history.get[0].params).toEqual(coordinates);
  });
});
