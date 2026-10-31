import { z } from 'zod';
import { isDemo } from '../lib/utils';
import {
  activitySchema,
  adminCategoryInputSchema,
  adminCategorySchema,
  businessSchema,
  cardSchema,
  promotionSchema,
  publicMenuSchema,
  type AdminCategoryInput,
  type BusinessConfig,
  type Promotion,
} from '../lib/types';
import { http } from './http';
import * as authService from './auth';
import { readAdminCategories, readDB, redeemDemo, updateAdminCategories, updateDB } from './demo';
// Proposed API contract. These routes and envelopes MUST be confirmed with the backend.
/** Payload para crear una promoción: los campos de identidad los rellena el backend/demo. */
export type PromotionInput = {
  title: string;
  description: string;
  expires: string;
  image: string;
} & Partial<Promotion>;

function unwrapPublicMenu(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const value = payload as Record<string, unknown>;
  for (const key of ['data', 'business', 'menu']) {
    if (value[key] && typeof value[key] === 'object') return unwrapPublicMenu(value[key]);
  }
  return payload;
}

function unwrapAdminCategoryList(payload: unknown): unknown {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== 'object') return current;
    const value = current as Record<string, unknown>;
    if (Array.isArray(value.categories)) return value.categories;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    current = value.data ?? value.categories ?? value.items;
  }
  return current;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function unwrapBusinessConfig(payload: unknown): Record<string, unknown> {
  let current = record(payload);
  for (let depth = 0; depth < 4; depth += 1) {
    const nested = record(current.data);
    if (Object.keys(nested).length) {
      current = nested;
      continue;
    }
    const business = record(current.business);
    if (Object.keys(business).length) {
      current = business;
      continue;
    }
    break;
  }
  return current;
}

function normalizeBusinessConfig(payload: unknown) {
  const value = unwrapBusinessConfig(payload);
  const cardSettings = record(value.card_settings ?? value.cardSettings);
  const name = typeof value.name === 'string' ? value.name : '';
  const categories = (Array.isArray(value.categories) ? value.categories : [])
    .map((category) => {
      if (typeof category === 'string') return category;
      const categoryRecord = record(category);
      return typeof categoryRecord.name === 'string' ? categoryRecord.name : '';
    })
    .filter(Boolean);
  const rawProducts = Array.isArray(value.products)
    ? value.products
    : Array.isArray(value.menuItems)
      ? value.menuItems
      : [];
  const menuItems = rawProducts
    .map((product, index) => {
      const item = record(product);
      const productCategory = record(item.category);
      const itemName = typeof item.name === 'string' ? item.name : '';
      if (!itemName.trim()) return null;
      const price =
        typeof item.price === 'string' || typeof item.price === 'number' ? item.price : undefined;
      const image = [item.image, item.image_url, item.imageUrl, item.photo_url].find(
        (candidate): candidate is string => typeof candidate === 'string' && Boolean(candidate),
      );
      return {
        id: String(item.id ?? `product-${index + 1}`),
        name: itemName,
        description: typeof item.description === 'string' ? item.description : undefined,
        price,
        category:
          typeof item.category === 'string'
            ? item.category
            : typeof productCategory.name === 'string'
              ? productCategory.name
              : typeof item.category_name === 'string'
                ? item.category_name
                : undefined,
        image,
        available:
          typeof item.available === 'boolean'
            ? item.available
            : typeof item.is_active === 'boolean'
              ? item.is_active
              : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const rawGoal = Number(cardSettings.required_stamps ?? value.goal ?? 8);
  const goal = Number.isFinite(rawGoal) ? Math.min(12, Math.max(2, Math.round(rawGoal))) : 8;
  const rawIcon = cardSettings.stamp_icon ?? value.icon;
  const icon =
    rawIcon === 'bread' || rawIcon === 'leaf' || rawIcon === 'coffee' ? rawIcon : 'coffee';
  const validTheme =
    value.theme === 'terracotta' || value.theme === 'lavender' ? value.theme : 'forest';
  const phone = typeof value.phone === 'string' ? value.phone : undefined;
  const addressParts = [value.address, value.city, value.country].filter(
    (part): part is string => typeof part === 'string' && Boolean(part.trim()),
  );
  const address = addressParts.join(', ');
  const logo = typeof value.logo_url === 'string' ? value.logo_url : value.logo;
  const banner = typeof value.background_url === 'string' ? value.background_url : value.banner;
  const primaryColor = cardSettings.primary_color ?? value.primaryColor;
  const secondaryColor = cardSettings.secondary_color ?? value.secondaryColor;
  const requiredString = (candidate: unknown) =>
    typeof candidate === 'string' && candidate.length ? candidate : undefined;
  const inferredOnboarded = Boolean(name.trim() && logo && categories.length);

  return {
    name,
    reward: requiredString(value.reward) ?? 'Recompensa por fidelidad',
    goal,
    theme: validTheme,
    icon,
    logo: typeof logo === 'string' ? logo : undefined,
    banner: typeof banner === 'string' ? banner : undefined,
    categories,
    menuImage: requiredString(value.menuImage),
    menuItems,
    primaryColor: typeof primaryColor === 'string' ? primaryColor : undefined,
    secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : undefined,
    welcomeMessage:
      requiredString(cardSettings.welcome_message) ?? requiredString(value.welcomeMessage),
    description: requiredString(value.description),
    phone,
    phoneNumbers: phone ? [phone] : [],
    address: address || undefined,
    location:
      [value.city, value.country]
        .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
        .join(', ') || undefined,
    openingHours: requiredString(value.openingHours),
    deliveryAvailable:
      typeof value.deliveryAvailable === 'boolean' ? value.deliveryAvailable : false,
    allowOrders: typeof value.allowOrders === 'boolean' ? value.allowOrders : true,
    fontFamily: value.fontFamily,
    menuStyle: value.menuStyle,
    onboarded: typeof value.onboarded === 'boolean' ? value.onboarded : inferredOnboarded,
  };
}

function slugifyBusiness(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
    isDemo
      ? readDB().favorites
      : z.array(z.string()).parse((await http.get('/customer/me/favorites')).data),
  publicBusinessMenu: async (slug: string) => {
    if (isDemo) {
      const business = readDB().business;
      if (slug !== slugifyBusiness(business.name) && slug !== 'demo')
        throw new Error('No encontramos este menú.');
      return publicMenuSchema.parse(business);
    }
    const { data } = await http.get(`api/public/business/${encodeURIComponent(slug)}`);
    return publicMenuSchema.parse(unwrapPublicMenu(data));
  },
  adminCategories: async () => {
    if (isDemo) return readAdminCategories();
    const { data } = await http.get('/api/admin/categories');
    return z.array(adminCategorySchema).parse(unwrapAdminCategoryList(data));
  },
  createAdminCategory: async (input: AdminCategoryInput) => {
    const category = adminCategoryInputSchema.parse(input);
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const created = { ...category, id: crypto.randomUUID() };
        categories.push(created);
        return created;
      });
    }
    return http.post('/api/admin/categories', category);
  },
  updateAdminCategory: async (id: string, input: AdminCategoryInput) => {
    const category = adminCategoryInputSchema.parse(input);
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const index = categories.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos esta categoría.');
        categories[index] = { ...category, id };
        return categories[index];
      });
    }
    return http.put(`/api/admin/categories/${encodeURIComponent(id)}`, category);
  },
  deleteAdminCategory: async (id: string) => {
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const index = categories.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos esta categoría.');
        categories.splice(index, 1);
      });
    }
    return http.delete(`/api/admin/categories/${encodeURIComponent(id)}`);
  },
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
  business: async () => {
    if (isDemo) return readDB().business;
    const { data } = await http.get('api/business/card');
    return businessSchema.parse(normalizeBusinessConfig(data));
  },
  saveBusiness: async (input: BusinessConfig) => {
    const config = businessSchema.parse(input);
    if (!isDemo) return http.put('/business/card', config);
    return updateDB((db) => {
      db.business = config;
      const card = db.cards.find((c) => c.id === 'cafe');
      if (card) Object.assign(card, { ...config, stamps: Math.min(card.stamps, config.goal) });
    });
  },
  addPromotion: async (input: PromotionInput) => {
    if (!isDemo) return http.post('/business/promotions', input);
    return updateDB((db) => {
      db.promotions.unshift({
        ...input,
        id: crypto.randomUUID(),
        businessId: 'b1',
        business: db.business.name,
        category:
          (input.category as string | undefined) ?? db.business.categories?.[0] ?? 'Cafetería',
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
