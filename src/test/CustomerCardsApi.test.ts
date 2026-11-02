import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Tarjetas del cliente', () => {
  it('normaliza tarjetas paginadas con loyalty_card y business anidados', async () => {
    apiMock.onGet('/customer/cards').reply(200, {
      data: [
        {
          id: 'customer-card-1',
          code: 'RYL2M22KEF',
          business_id: 'business-1',
          stamps_count: 1,
          required_stamps: 10,
          stamps_remaining: 9,
          progress_percentage: 10,
          progress: { unit: 'visits', current: 1, required: 10, remaining: 9 },
          status: 'active',
          loyalty_card: {
            id: 'loyalty-card-1',
            business_id: 'business-1',
            name: 'Taqueria Chayito',
            type: 'visits',
            type_label: 'Por cantidad de visitas',
            required_stamps: null,
            reward_description: null,
            settings: {},
            business: {
              id: 'business-1',
              name: 'Taqueria Chayito',
              description: 'Tacos y quesadillas hechos al momento.',
              categories: [{ id: 11, name: 'Tacos', sort_order: 0 }],
              latitude: 19.3020916,
              longitude: -104.1540069,
              logo_url:
                '[http://127.0.0.1:8000/storage/businesses/business-1/logo.webp](http://127.0.0.1:8000/storage/businesses/business-1/logo.webp)',
              card_settings: {
                primary_color: '#F59E0B',
                secondary_color: '#111827',
                text_color: '#FFFFFF',
                stamp_icon: 'star',
                card_shape: 'rounded',
                required_stamps: 10,
              },
            },
          },
          business: {
            id: 'business-1',
            name: 'Taqueria Chayito',
            categories: [{ id: 11, name: 'Tacos', sort_order: 0 }],
            latitude: 19.3020916,
            longitude: -104.1540069,
            logo_url:
              '[http://127.0.0.1:8000/storage/businesses/business-1/logo.webp](http://127.0.0.1:8000/storage/businesses/business-1/logo.webp)',
            card_settings: {
              primary_color: '#F59E0B',
              secondary_color: '#111827',
              text_color: '#FFFFFF',
              stamp_icon: 'star',
              card_shape: 'rounded',
              required_stamps: 10,
            },
          },
        },
      ],
      links: { next: null, prev: null },
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    });

    const cards = await api.cards();

    expect(apiMock.history.get[0].params).toEqual({ per_page: 100 });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'customer-card-1',
      businessId: 'business-1',
      name: 'Taqueria Chayito',
      category: 'Tacos',
      stamps: 1,
      goal: 10,
      icon: 'star',
      primaryColor: '#F59E0B',
      secondaryColor: '#111827',
      textColor: '#FFFFFF',
      cardShape: 'rounded',
      joined: true,
      location: 'Ubicación en mapa',
      latitude: 19.3020916,
      longitude: -104.1540069,
    });
    expect(cards[0].logo).toContain('/storage/businesses/business-1/logo.webp');
    expect(new URL(cards[0].logo!).hostname).not.toBe('127.0.0.1');
  });
});
