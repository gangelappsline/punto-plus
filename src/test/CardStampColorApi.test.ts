import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';

vi.stubEnv('VITE_DATA_MODE', 'api');
vi.resetModules();

const { http } = await import('../services/http');
const { api } = await import('../services/api');
const apiMock = new AxiosMockAdapter(http);

afterAll(() => vi.unstubAllEnvs());
beforeEach(() => apiMock.reset());

describe('Color del icono del sello en el perfil del negocio', () => {
  it('lee stamp_icon_color de los ajustes de la tarjeta', async () => {
    apiMock.onGet('/business/profile').reply(200, {
      data: {
        id: 'business-1',
        name: 'Café Aurora',
        category: 'Cafetería',
        card_settings: {
          primary_color: '#f5be8b',
          secondary_color: '#fcebd7',
          text_color: '#022f53',
          stamp_icon: 'coffee',
          stamp_icon_color: '#B5772F',
        },
        loyalty_cards: [
          {
            id: 'card-1',
            name: 'Club Aurora',
            reward_description: 'Café gratis',
            required_stamps: 8,
          },
        ],
      },
    });

    const business = await api.business();

    expect(business.cardStampIconColor).toBe('#B5772F');
  });

  it('ignora un color inválido y deja que el tema decida', async () => {
    apiMock.onGet('/business/profile').reply(200, {
      data: {
        id: 'business-1',
        name: 'Café Aurora',
        card_settings: { stamp_icon: 'coffee', stamp_icon_color: 'azul' },
        loyalty_cards: [{ id: 'card-1', name: 'Club Aurora', required_stamps: 8 }],
      },
    });

    const business = await api.business();

    expect(business.cardStampIconColor).toBeUndefined();
  });

  it('envía stamp_icon_color en card-settings y en la tarjeta de lealtad', async () => {
    apiMock.onPut('/business/profile').reply(200, { data: { id: 'business-1' } });
    apiMock.onPut('/business/card-settings').reply(200, { data: { card_settings: {} } });
    apiMock.onPut('/business/cards/card-1').reply(200, { data: { id: 'card-1' } });

    await api.saveBusiness({
      name: 'Café Aurora',
      reward: 'Café gratis',
      goal: 8,
      theme: 'terracotta',
      icon: 'coffee',
      cardPrimaryColor: '#f5be8b',
      cardSecondaryColor: '#fcebd7',
      cardTextColor: '#022f53',
      cardStampIconColor: '#ff00aa',
      loyaltyCardId: 'card-1',
      categories: ['Cafetería'],
      menuItems: [],
    });

    expect(JSON.parse(apiMock.history.put[1].data)).toMatchObject({
      stamp_icon: 'coffee',
      stamp_icon_color: '#ff00aa',
    });
    expect(JSON.parse(apiMock.history.put[2].data)).toMatchObject({
      settings: { theme: 'terracotta', stamp_icon: 'coffee', stamp_icon_color: '#ff00aa' },
    });
  });

  it('usa el color por defecto del tema cuando el negocio no elige uno', async () => {
    apiMock.onPut('/business/profile').reply(200, { data: { id: 'business-1' } });
    apiMock.onPut('/business/card-settings').reply(200, { data: { card_settings: {} } });
    apiMock.onPut('/business/cards/card-1').reply(200, { data: { id: 'card-1' } });

    await api.saveBusiness({
      name: 'Café Aurora',
      reward: 'Café gratis',
      goal: 8,
      theme: 'midnight',
      icon: 'star',
      loyaltyCardId: 'card-1',
      categories: ['Cafetería'],
      menuItems: [],
    });

    expect(JSON.parse(apiMock.history.put[1].data)).toMatchObject({
      stamp_icon_color: '#404874',
    });
  });
});
