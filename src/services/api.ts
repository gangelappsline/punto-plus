import { z } from 'zod';
import { isDemo } from '../lib/utils';
import {
  activitySchema,
  businessSchema,
  cardSchema,
  promotionSchema,
  type BusinessConfig,
  type Promotion,
} from '../lib/types';
import { http } from './http';
import * as authService from './auth';
import { readDB, redeemDemo, updateDB } from './demo';
// Proposed API contract. These routes and envelopes MUST be confirmed with the backend.
export const api = {
  cards: async () =>
    isDemo ? readDB().cards : z.array(cardSchema).parse((await http.get('/customer/cards')).data),
  promotions: async () =>
    isDemo
      ? readDB().promotions
      : z.array(promotionSchema).parse((await http.get('/customer/promotions')).data),
  activity: async () =>
    isDemo
      ? readDB().activity
      : z.array(activitySchema).parse((await http.get('/customer/me/activity')).data),
  favorites: async () =>
    isDemo ? readDB().favorites : z.array(z.string()).parse((await http.get('/customer/me/favorites')).data),
  toggleFavorite: async (id: string) =>
    isDemo
      ? updateDB((db) => {
          db.favorites = db.favorites.includes(id)
            ? db.favorites.filter((f) => f !== id)
            : [...db.favorites, id];
        })
      : http.post(`/customer/me/favorites/${encodeURIComponent(id)}/toggle`),
  join: async (id: string) => {
    if (!isDemo) return http.post(`/customer/cards/${encodeURIComponent(id)}/join`);
    return updateDB((db) => {
      const card = db.cards.find((c) => c.id === id);
      if (!card) throw new Error('No se encontró el negocio.');
      if (card.joined) return;
      card.joined = true;
      db.activity.unshift({
        id: crypto.randomUUID(),
        business: card.name,
        title: 'Te uniste a su comunidad',
        date: new Date().toISOString(),
        type: 'join',
        amount: 0,
      });
    });
  },
  redeem: async (id: string) =>
    isDemo
      ? redeemDemo(id)
      : http.post(
          `/customer/cards/${encodeURIComponent(id)}/redeem`,
          {},
          { headers: { 'Idempotency-Key': crypto.randomUUID() } },
        ),
  qr: async () =>
    isDemo
      ? { token: 'punto-plus:demo:sofia', expiresAt: null }
      : z
          .object({ token: z.string(), expiresAt: z.string().datetime() })
          .parse((await http.post('/customer/me/qr')).data),
  businessPromotions: async () =>
    z.array(promotionSchema).parse((await http.get('/business/promotions')).data),
  business: async () =>
    isDemo ? readDB().business : businessSchema.parse((await http.get('/business/card')).data),
  saveBusiness: async (input: BusinessConfig) => {
    const config = businessSchema.parse(input);
    if (!isDemo) return http.put('/business/card', config);
    return updateDB((db) => {
      db.business = config;
      const card = db.cards.find((c) => c.id === 'cafe');
      if (card) Object.assign(card, { ...config, stamps: Math.min(card.stamps, config.goal) });
    });
  },
  addPromotion: async (input: Pick<Promotion, 'title' | 'description' | 'expires' | 'image'>) => {
    if (!isDemo) return http.post('/business/promotions', input);
    return updateDB((db) => {
      db.promotions.unshift({
        ...input,
        id: crypto.randomUUID(),
        businessId: 'b1',
        business: db.business.name,
        category: 'Cafetería',
        badge: 'Nuevo para ti',
      });
    });
  },
  stamp: async (token: string) => {
    if (!isDemo)
      return http.post(
        '/business/purchases',
        { token },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
    if (token !== 'punto-plus:demo:sofia')
      throw new Error('QR no válido. En demo utiliza el QR de Sofía.');
    return updateDB((db) => {
      const card = db.cards.find((c) => c.id === 'cafe')!;
      if (card.stamps >= card.goal)
        throw new Error('La tarjeta está completa. Primero canjea la recompensa.');
      card.stamps += 1;
      db.activity.unshift({
        id: crypto.randomUUID(),
        business: card.name,
        title: 'Una visita, un sello más',
        date: new Date().toISOString(),
        type: 'stamp',
        amount: 1,
      });
    });
  },
  // Autenticación con Laravel Passport (Bearer token + refresh token).
  login: authService.login,
  register: authService.register,
  restore: authService.restore,
  logout: authService.logout,
};
