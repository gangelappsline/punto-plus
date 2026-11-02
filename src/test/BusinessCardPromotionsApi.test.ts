import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Tema de tarjeta y promociones del negocio', () => {
  it('lee el perfil documentado y normaliza los ajustes visuales y tarjetas', async () => {
    apiMock.onGet('/api/business/profile').reply(200, {
      data: {
        id: 'business-1',
        name: 'Café Aurora',
        logo_url: null,
        background_url: null,
        category: 'Cafetería',
        card_settings: {
          primary_color: '#f5be8b',
          secondary_color: '#fcebd7',
          text_color: '#022f53',
          stamp_icon: 'coffee',
          card_shape: 'circle',
          welcome_message: '¡Bienvenido!',
          required_stamps: 8,
        },
        loyalty_cards: [
          {
            id: 'card-1',
            name: 'Club Aurora',
            reward_description: 'Café gratis',
            required_stamps: 8,
            primary_color: '#f5be8b',
            secondary_color: '#fcebd7',
            text_color: '#022f53',
            settings: { theme: 'terracotta', stamp_icon: 'coffee' },
          },
        ],
      },
    });

    const business = await api.business();

    expect(apiMock.history.get[0].url).toBe('/api/business/profile');
    expect(business).toMatchObject({
      name: 'Café Aurora',
      theme: 'terracotta',
      goal: 8,
      reward: 'Café gratis',
      icon: 'coffee',
      cardPrimaryColor: '#f5be8b',
      cardSecondaryColor: '#fcebd7',
      cardTextColor: '#022f53',
      cardShape: 'circle',
      loyaltyCardId: 'card-1',
      loyaltyCards: [{ id: 'card-1', name: 'Club Aurora' }],
    });
  });

  it('guarda el perfil, los ajustes por defecto y el tema de la tarjeta existente', async () => {
    apiMock.onPut('/api/business/profile').reply(200, { data: { id: 'business-1' } });
    apiMock.onPut('/api/business/card-settings').reply(200, { data: { card_settings: {} } });
    apiMock.onPut('/api/business/cards/card-1').reply(200, { data: { id: 'card-1' } });

    await api.saveBusiness({
      name: 'Café Aurora',
      reward: 'Café gratis',
      goal: 8,
      theme: 'terracotta',
      icon: 'coffee',
      cardPrimaryColor: '#f5be8b',
      cardSecondaryColor: '#fcebd7',
      cardTextColor: '#022f53',
      cardShape: 'circle',
      loyaltyCardId: 'card-1',
      categories: ['Cafetería'],
      menuItems: [],
    });

    expect(apiMock.history.put.map((request) => request.url)).toEqual([
      '/api/business/profile',
      '/api/business/card-settings',
      '/api/business/cards/card-1',
    ]);
    expect(JSON.parse(apiMock.history.put[1].data)).toMatchObject({
      primary_color: '#f5be8b',
      secondary_color: '#fcebd7',
      text_color: '#022f53',
      stamp_icon: 'coffee',
      card_shape: 'circle',
      required_stamps: 8,
    });
    expect(JSON.parse(apiMock.history.put[2].data)).toMatchObject({
      name: 'Café Aurora',
      reward_description: 'Café gratis',
      required_stamps: 8,
      settings: { theme: 'terracotta', stamp_icon: 'coffee', card_shape: 'circle' },
    });
  });

  it('lee promociones paginadas con el contrato nuevo', async () => {
    apiMock.onGet('/api/business/promotions').reply(200, {
      data: [
        {
          id: 'promotion-1',
          business_id: 'business-1',
          business: { name: 'Café Aurora' },
          loyalty_card_id: 'card-1',
          title: '20% en bebidas',
          description: 'Todos los jueves.',
          image_url: null,
          discount_type: 'percentage',
          discount_type_label: 'Porcentaje',
          discount_value: 20,
          code: 'JUEVES20',
          terms: 'No acumulable.',
          starts_at: '2026-11-01T09:00:00Z',
          ends_at: '2026-12-01T23:59:00Z',
          is_active: true,
          is_active_now: true,
          max_redemptions: 100,
          redemptions_count: 12,
        },
      ],
      links: { next: null },
      meta: { current_page: 1, last_page: 1, total: 1 },
    });

    const promotions = await api.businessPromotions();

    expect(apiMock.history.get[0].params).toEqual({ per_page: 100 });
    expect(promotions[0]).toMatchObject({
      id: 'promotion-1',
      business: 'Café Aurora',
      title: '20% en bebidas',
      discountType: 'percentage',
      discountValue: 20,
      discountTypeLabel: 'Porcentaje',
      code: 'JUEVES20',
      loyaltyCardId: 'card-1',
      redemptionsCount: 12,
      maxRedemptions: 100,
    });
  });

  it('crea promociones con los nombres de campos definidos por OpenAPI', async () => {
    apiMock.onPost('/api/business/promotions').reply(201, { data: { id: 'promotion-2' } });

    await api.addPromotion({
      title: 'Dos por uno',
      description: 'Aplica los martes.',
      loyaltyCardId: 'card-1',
      discountType: 'fixed',
      discountValue: 50,
      code: 'MARTES2X1',
      terms: 'No acumulable.',
      startsAt: '2026-11-01T09:00:00.000Z',
      endsAt: '2026-12-01T23:59:00.000Z',
      maxRedemptions: 40,
      isActive: true,
    });

    expect(apiMock.history.post[0].url).toBe('/api/business/promotions');
    expect(JSON.parse(apiMock.history.post[0].data)).toEqual({
      title: 'Dos por uno',
      description: 'Aplica los martes.',
      loyalty_card_id: 'card-1',
      discount_type: 'fixed',
      discount_value: 50,
      code: 'MARTES2X1',
      terms: 'No acumulable.',
      starts_at: '2026-11-01T09:00:00.000Z',
      ends_at: '2026-12-01T23:59:00.000Z',
      max_redemptions: 40,
      is_active: true,
    });
  });
});
