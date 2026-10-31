import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

const emptyBusinessProfile = {
  id: '01a18f38-014a-73af-9f7b-13717a623c1d',
  name: null,
  slug: null,
  description: null,
  categories: [],
  phone: null,
  email: null,
  website: null,
  address: null,
  city: null,
  country: null,
  latitude: null,
  longitude: null,
  logo_url: null,
  background_url: null,
  stamp_icon_url: null,
  card_settings: {
    primary_color: '#F59E0B',
    secondary_color: '#111827',
    text_color: '#FFFFFF',
    stamp_icon: 'star',
    card_shape: 'rounded',
    welcome_message: '¡Bienvenido a nuestro programa de fidelidad!',
    required_stamps: 10,
  },
  products: [],
  is_active: true,
  owner: { id: 8, name: 'Ángel Rodríguez', email: 'angel@example.com', role: 'business' },
  loyalty_cards: [],
  created_at: '2026-10-30T17:49:34-06:00',
};

describe('Perfil de negocio recién creado', () => {
  it('normaliza valores nulos y listas vacías sin impedir abrir Mi menú', async () => {
    apiMock.onGet('business/card').reply(200, emptyBusinessProfile);

    const business = await api.business();

    expect(apiMock.history.get[0].url).toBe('business/card');
    expect(business).toMatchObject({
      name: '',
      reward: 'Recompensa por fidelidad',
      goal: 10,
      theme: 'forest',
      icon: 'coffee',
      categories: [],
      menuItems: [],
      primaryColor: '#F59E0B',
      secondaryColor: '#111827',
      welcomeMessage: '¡Bienvenido a nuestro programa de fidelidad!',
      onboarded: false,
    });
    expect(business.logo).toBeUndefined();
    expect(business.banner).toBeUndefined();
  });

  it('también acepta el perfil dentro de una envoltura data', async () => {
    apiMock.onGet('business/card').reply(200, { data: emptyBusinessProfile });

    await expect(api.business()).resolves.toMatchObject({
      name: '',
      categories: [],
      menuItems: [],
    });
  });
});
