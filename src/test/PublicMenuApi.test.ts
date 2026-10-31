import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Menú público de negocio', () => {
  it('resuelve por slug con el endpoint público y valida la respuesta envuelta', async () => {
    apiMock.onGet('/public/business/cafe-avellaneda/menu').reply(200, {
      data: {
        business: {
          id: 8,
          slug: 'cafe-avellaneda',
          name: 'Café Avellaneda',
          banner: '/cafe/banner.webp',
          logo: '/cafe/logo.webp',
          categories: ['Cafetería'],
          menuItems: [
            {
              id: 'dish-1',
              name: 'Capuchino',
              price: 55,
              category: 'Cafetería',
              image: '/cafe/capuchino.webp',
              isPopular: true,
            },
          ],
        },
      },
    });

    const menu = await api.publicBusinessMenu('cafe-avellaneda');

    expect(apiMock.history.get[0].url).toBe('/public/business/cafe-avellaneda/menu');
    expect(apiMock.history.get[0].headers?.Authorization).toBeUndefined();
    expect(menu).toMatchObject({
      slug: 'cafe-avellaneda',
      name: 'Café Avellaneda',
      menuItems: [{ name: 'Capuchino', price: '55', isPopular: true }],
    });
  });
});
