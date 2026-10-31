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
  it('consulta y normaliza las categorías públicas disponibles', async () => {
    apiMock.onGet('/public/categories').reply(200, {
      data: {
        categories: [
          { id: 3, name: 'Bebidas', slug: 'bebidas', icon: '/storage/categories/drinks.webp' },
          { id: 4, title: 'Postres' },
        ],
      },
    });

    await expect(api.publicCategories()).resolves.toEqual([
      { id: '3', name: 'Bebidas', icon: '/storage/categories/drinks.webp' },
      { id: '4', name: 'Postres' },
    ]);
    expect(apiMock.history.get[0].url).toBe('/public/categories');
  });

  it('envía el guardado de un paso con PATCH y conserva el orden de IDs de categorías', async () => {
    apiMock.onPatch('/business/card').reply(200, { ok: true });
    const config = {
      name: 'Café de prueba',
      reward: 'Bebida gratis',
      goal: 8,
      theme: 'forest' as const,
      icon: 'coffee' as const,
      categories: ['Cafetería'],
      menuItems: [],
    };

    await api.saveBusinessStep({
      step: 'categories',
      data: { category_ids: ['category-2', 'category-1'] },
      config,
    });

    expect(apiMock.history.patch[0].url).toBe('/business/card');
    expect(JSON.parse(apiMock.history.patch[0].data)).toEqual({
      step: 'categories',
      data: { category_ids: ['category-2', 'category-1'] },
    });
  });

  it('resuelve por slug con el endpoint público y valida la respuesta envuelta', async () => {
    apiMock.onGet('api/public/business/cafe-avellaneda').reply(200, {
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

    expect(apiMock.history.get[0].url).toBe('api/public/business/cafe-avellaneda');
    expect(apiMock.history.get[0].headers?.Authorization).toBeUndefined();
    expect(menu).toMatchObject({
      slug: 'cafe-avellaneda',
      name: 'Café Avellaneda',
      menuItems: [{ name: 'Capuchino', price: '55', isPopular: true }],
    });
  });
});
