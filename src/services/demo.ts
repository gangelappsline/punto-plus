import { z } from 'zod';
import {
  activitySchema,
  businessSchema,
  cardSchema,
  promotionSchema,
  type LoyaltyCard,
} from '../lib/types';
export const initialCards: LoyaltyCard[] = [
  {
    id: 'cafe',
    businessId: 'b1',
    name: 'Café Avellaneda',
    category: 'Cafetería',
    tagline: 'Tu pausa favorita, con recompensa.',
    reward: 'Un café de especialidad gratis',
    stamps: 6,
    goal: 8,
    theme: 'forest',
    icon: 'coffee',
    location: 'Roma Norte, CDMX',
    distance: '350 m',
    joined: true,
  },
  {
    id: 'pan',
    businessId: 'b2',
    name: 'Pan de Barrio',
    category: 'Panadería',
    tagline: 'Hecho con calma. Disfrutado contigo.',
    reward: 'Un pan de la casa gratis',
    stamps: 4,
    goal: 6,
    theme: 'terracotta',
    icon: 'bread',
    location: 'Condesa, CDMX',
    distance: '800 m',
    joined: true,
  },
  {
    id: 'matcha',
    businessId: 'b3',
    name: 'Matcha & Co.',
    category: 'Bebidas',
    tagline: 'Un ritual que siempre se antoja.',
    reward: 'Tu matcha favorito gratis',
    stamps: 5,
    goal: 5,
    theme: 'lavender',
    icon: 'leaf',
    location: 'Juárez, CDMX',
    distance: '1.2 km',
    joined: true,
  },
  {
    id: 'flor',
    businessId: 'b4',
    name: 'Casa Botánica',
    category: 'Bienestar',
    tagline: 'Pequeños momentos para florecer.',
    reward: 'Una plantita para tu hogar',
    stamps: 0,
    goal: 6,
    theme: 'forest',
    icon: 'leaf',
    location: 'Roma Sur, CDMX',
    distance: '1.8 km',
    joined: false,
  },
];
const seed = () => ({
  cards: initialCards.map((c) => ({ ...c })),
  promotions: [
    {
      id: 'p1',
      businessId: 'b1',
      business: 'Café Avellaneda',
      title: 'Las buenas mañanas son de dos.',
      description:
        '2×1 en cappuccinos de 8:00 a 11:00 h. Válido de lunes a viernes en sucursal, hasta agotar existencias. No acumulable con otras promociones.',
      category: 'Cafetería',
      image: '/images/coffee.webp',
      badge: '2×1 en cappuccinos',
      expires: '2026-12-31',
    },
    {
      id: 'p2',
      businessId: 'b2',
      business: 'Pan de Barrio',
      title: 'Un antojo recién horneado.',
      description:
        'Disfruta 20% de descuento en tu segunda pieza de pan. Válido en piezas de igual o menor precio, de lunes a jueves. No acumulable.',
      category: 'Panadería',
      image: '/images/bakery.webp',
      badge: '20% de descuento',
      expires: '2026-12-31',
    },
    {
      id: 'p3',
      businessId: 'b3',
      business: 'Matcha & Co.',
      title: 'Tu ritual, un poquito más verde.',
      description:
        'Leche vegetal sin costo al comprar cualquier matcha grande. Una bebida por persona y visita. Válido todos los días.',
      category: 'Bebidas',
      image: '/images/matcha.webp',
      badge: 'Un extra para ti',
      expires: '2026-12-31',
    },
  ],
  activity: [
    {
      id: 'a1',
      business: 'Matcha & Co.',
      title: '¡Completaste tu tarjeta!',
      date: '2026-10-06T09:30:00Z',
      type: 'stamp' as const,
      amount: 1,
    },
    {
      id: 'a2',
      business: 'Café Avellaneda',
      title: 'Una visita, un sello más',
      date: '2026-10-05T16:30:00Z',
      type: 'stamp' as const,
      amount: 1,
    },
    {
      id: 'a3',
      business: 'Pan de Barrio',
      title: 'Una visita, un sello más',
      date: '2026-10-04T12:30:00Z',
      type: 'stamp' as const,
      amount: 1,
    },
    {
      id: 'a4',
      business: 'Café Avellaneda',
      title: 'Te uniste a su comunidad',
      date: '2026-10-01T12:30:00Z',
      type: 'join' as const,
      amount: 0,
    },
  ],
  business: {
    name: 'Café Avellaneda',
    reward: 'Un café de especialidad gratis',
    goal: 8,
    theme: 'forest' as const,
    icon: 'coffee' as const,
    logo: '',
  },
  favorites: [] as string[],
});
const dbSchema = z.object({
  cards: z.array(cardSchema),
  promotions: z.array(promotionSchema),
  activity: z.array(activitySchema),
  business: businessSchema,
  favorites: z.array(z.string()),
});
export type DemoDB = z.infer<typeof dbSchema>;
const KEY = 'punto-plus-demo-v1';
export function readDB(): DemoDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return dbSchema.parse(JSON.parse(raw));
  } catch {
    /* Corrupt or unavailable storage: fall back safely. */
  }
  return seed();
}
export function updateDB<T>(update: (db: DemoDB) => T): T {
  const db = readDB();
  const result = update(db);
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error(
      'No se pudieron guardar los cambios. Revisa el espacio o los permisos del navegador.',
    );
  }
  return result;
}
export function redeemDemo(id: string) {
  return updateDB((db) => {
    const card = db.cards.find((c) => c.id === id);
    if (!card || !card.joined || card.stamps < card.goal)
      throw new Error('Todavía necesitas más sellos para canjear esta recompensa.');
    card.stamps -= card.goal;
    db.activity.unshift({
      id: crypto.randomUUID(),
      business: card.name,
      title: 'Canjeaste: ' + card.reward,
      date: new Date().toISOString(),
      type: 'reward',
      amount: 1,
    });
    return card;
  });
}
