import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('CRUD de categorías administrativas', () => {
  it('consulta y normaliza la lista desde /api/admin/categories', async () => {
    apiMock.onGet('/api/admin/categories').reply(200, {
      data: {
        categories: [{ id: 7, name: 'Cafetería', icon: 'data:image/webp;base64,icon' }],
      },
    });

    const categories = await api.adminCategories();

    expect(apiMock.history.get[0].url).toBe('/api/admin/categories');
    expect(categories).toEqual([
      { id: '7', name: 'Cafetería', icon: 'data:image/webp;base64,icon' },
    ]);
  });

  it('crea, actualiza y elimina una categoría en la ruta REST indicada', async () => {
    apiMock.onPost('/api/admin/categories').reply(201, { id: 1 });
    apiMock.onPut('/api/admin/categories/category-1').reply(200, { id: 'category-1' });
    apiMock.onDelete('/api/admin/categories/category-1').reply(204);
    const input = { name: 'Panadería', icon: 'data:image/webp;base64,icon' };

    await api.createAdminCategory(input);
    await api.updateAdminCategory('category-1', input);
    await api.deleteAdminCategory('category-1');

    expect(apiMock.history.post[0].url).toBe('/api/admin/categories');
    expect(JSON.parse(apiMock.history.post[0].data as string)).toEqual(input);
    expect(apiMock.history.put[0].url).toBe('/api/admin/categories/category-1');
    expect(JSON.parse(apiMock.history.put[0].data as string)).toEqual(input);
    expect(apiMock.history.delete[0].url).toBe('/api/admin/categories/category-1');
  });
});
