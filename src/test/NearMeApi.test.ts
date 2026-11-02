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

  it('normaliza negocios desde el sobre paginado real', async () => {
    const coordinates = { latitude: 19.3020916, longitude: -104.1540069 };
    apiMock.onGet('/customer/near-me').reply(200, {
      data: [
        {
          id: 45,
          name: 'Taqueria Chayito',
          category: 'Restaurante',
          logo_url: 'https://example.com/chayito.png',
          latitude: 19.3020916,
          longitude: -104.1540069,
          categories: ['Restaurante', 'Mexicana'],
          distance_km: 0,
          has_card: true,
          is_active: true,
          loyalty_cards_count: 2,
          promotions_count: 3,
        },
      ],
      links: { first: 'https://api.example.test/customer/near-me?page=1' },
      meta: { current_page: 1, last_page: 1, total: 1 },
      center: coordinates,
    });

    const businesses = await api.nearMe(coordinates);

    expect(apiMock.history.get[0].params).toEqual(coordinates);
    expect(businesses).toEqual([
      expect.objectContaining({
        id: '45',
        name: 'Taqueria Chayito',
        category: 'Restaurante',
        logo: 'https://example.com/chayito.png',
        latitude: 19.3020916,
        longitude: -104.1540069,
        location: 'Ubicación en mapa',
        distanceKm: 0,
        hasCard: true,
        isActive: true,
        activeLoyaltyCardsCount: 2,
        activePromotionsCount: 3,
      }),
    ]);
  });
});
