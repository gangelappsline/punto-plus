import { z } from 'zod';
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['client', 'business', 'admin']),
});
export type User = z.infer<typeof userSchema>;
/**
 * Paleta de fondos de tarjeta. Cada tema define colores de fondo, tinta y
 * sellos; además de los temas de marca hay familias neutras (azules, verdes,
 * cálidos, oscuros y claros) para que el negocio encuentre su tono sin salir de
 * la paleta. El negocio puede afinar el resultado con los selectores de color.
 */
export const loyaltyCardThemes = [
  // Marca
  'forest',
  'terracotta',
  'lavender',
  'ocean',
  'matcha',
  'citrus',
  'berry',
  'rose',
  'chocolate',
  'sunset',
  'sky',
  'midnight',
  // Azules
  'marine',
  'denim',
  'steel',
  'teal',
  'aqua',
  'sapphire',
  // Verdes
  'sage',
  'moss',
  'olive',
  'pine',
  'emerald',
  'mint',
  // Cálidos
  'caramel',
  'peach',
  'coral',
  'wine',
  'mustard',
  'clay',
  // Oscuros
  'graphite',
  'espresso',
  'plum',
  'navy',
  // Claros
  'sand',
  'paper',
  'linen',
  'blush',
  'stone',
  'ice',
] as const;
export const foodBrandIcons = [
  'coffee',
  'bread',
  'leaf',
  'pizza',
  'cake',
  'ice-cream',
  'soup',
  'fish',
  'salad',
  'burger',
  'milk',
  'soda',
  'apple',
  'cookie',
  'taco',
  'croissant',
  'popcorn',
  'cherry',
  'candy',
  'utensils',
  'glass',
  'bean',
  'star',
] as const;
export const menuFontFamilies = [
  'dm-sans',
  'manrope',
  'serif',
  'outfit',
  'lora',
  'nunito',
] as const;
export const loyaltyCardThemeSchema = z.enum(loyaltyCardThemes);
export const foodBrandIconSchema = z.enum(foodBrandIcons);
export const menuFontFamilySchema = z.enum(menuFontFamilies);
export type LoyaltyCardTheme = (typeof loyaltyCardThemes)[number];

export interface LoyaltyCardThemeColors {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  /** Color del icono del sello ya completado (`stamp_icon_color`). */
  stampIconColor: string;
}

/** Colores por defecto de cada tema; el negocio puede sobreescribirlos. */
export const loyaltyCardThemeColors: Record<LoyaltyCardTheme, LoyaltyCardThemeColors> = {
  forest: {
    primaryColor: '#254865',
    secondaryColor: '#d9e5ef',
    textColor: '#f1f5f8',
    stampIconColor: '#2e5578',
  },
  terracotta: {
    primaryColor: '#f5be8b',
    secondaryColor: '#fcebd7',
    textColor: '#022f53',
    stampIconColor: '#b5772f',
  },
  lavender: {
    primaryColor: '#d9e6f2',
    secondaryColor: '#2399a0',
    textColor: '#1d4160',
    stampIconColor: '#ffffff',
  },
  ocean: {
    primaryColor: '#187f87',
    secondaryColor: '#e4f6f5',
    textColor: '#f2ffff',
    stampIconColor: '#17666b',
  },
  matcha: {
    primaryColor: '#67845b',
    secondaryColor: '#ecf2df',
    textColor: '#fbfff5',
    stampIconColor: '#59744c',
  },
  citrus: {
    primaryColor: '#e9c85d',
    secondaryColor: '#fff9df',
    textColor: '#453a1e',
    stampIconColor: '#6b5717',
  },
  berry: {
    primaryColor: '#80536f',
    secondaryColor: '#f4e6ef',
    textColor: '#fff7fd',
    stampIconColor: '#754461',
  },
  rose: {
    primaryColor: '#e7a6b3',
    secondaryColor: '#fff5f5',
    textColor: '#4d2c3b',
    stampIconColor: '#934d65',
  },
  chocolate: {
    primaryColor: '#76533f',
    secondaryColor: '#f4e8d9',
    textColor: '#fff9f0',
    stampIconColor: '#6a4937',
  },
  sunset: {
    primaryColor: '#e78c62',
    secondaryColor: '#fff2e9',
    textColor: '#452d28',
    stampIconColor: '#a95537',
  },
  sky: {
    primaryColor: '#82b8d0',
    secondaryColor: '#eef9fc',
    textColor: '#153c52',
    stampIconColor: '#24728b',
  },
  midnight: {
    primaryColor: '#39416c',
    secondaryColor: '#e8e8f5',
    textColor: '#f4f5ff',
    stampIconColor: '#404874',
  },
  marine: {
    primaryColor: '#1c4f7c',
    secondaryColor: '#e2eef8',
    textColor: '#f2f8ff',
    stampIconColor: '#2a6597',
  },
  denim: {
    primaryColor: '#3a6ea5',
    secondaryColor: '#ebf3fb',
    textColor: '#f7fbff',
    stampIconColor: '#4a83bd',
  },
  steel: {
    primaryColor: '#5b7186',
    secondaryColor: '#eef2f6',
    textColor: '#f7fafc',
    stampIconColor: '#6f879c',
  },
  teal: {
    primaryColor: '#146c72',
    secondaryColor: '#e0f5f3',
    textColor: '#f0fdfb',
    stampIconColor: '#2399a0',
  },
  aqua: {
    primaryColor: '#7fc6c9',
    secondaryColor: '#f0fbfb',
    textColor: '#0d3b45',
    stampIconColor: '#3f8f93',
  },
  sapphire: {
    primaryColor: '#28418f',
    secondaryColor: '#e9edfb',
    textColor: '#f4f6ff',
    stampIconColor: '#3f5cad',
  },
  sage: {
    primaryColor: '#93a98c',
    secondaryColor: '#f1f6ee',
    textColor: '#1f3326',
    stampIconColor: '#5f7a5b',
  },
  moss: {
    primaryColor: '#4f6b47',
    secondaryColor: '#eaf1e4',
    textColor: '#f6fbf2',
    stampIconColor: '#65845c',
  },
  olive: {
    primaryColor: '#7c8446',
    secondaryColor: '#f4f6e4',
    textColor: '#2e3315',
    stampIconColor: '#949c5c',
  },
  pine: {
    primaryColor: '#1f4d3d',
    secondaryColor: '#e1efe8',
    textColor: '#f1fbf6',
    stampIconColor: '#2f6a53',
  },
  emerald: {
    primaryColor: '#1c7a5c',
    secondaryColor: '#e3f7ef',
    textColor: '#f0fdf8',
    stampIconColor: '#2ea07a',
  },
  mint: {
    primaryColor: '#b9e3d2',
    secondaryColor: '#f5fffb',
    textColor: '#16463a',
    stampIconColor: '#4f9d82',
  },
  caramel: {
    primaryColor: '#b57d45',
    secondaryColor: '#fbf1e4',
    textColor: '#fffaf3',
    stampIconColor: '#cf9a63',
  },
  peach: {
    primaryColor: '#f6c6a8',
    secondaryColor: '#fff6ef',
    textColor: '#5a3323',
    stampIconColor: '#c9805a',
  },
  coral: {
    primaryColor: '#e2735f',
    secondaryColor: '#fff0ec',
    textColor: '#4d1f18',
    stampIconColor: '#b8503c',
  },
  wine: {
    primaryColor: '#7a2c3f',
    secondaryColor: '#f7e6ea',
    textColor: '#fff5f7',
    stampIconColor: '#a04a5e',
  },
  mustard: {
    primaryColor: '#d6a02c',
    secondaryColor: '#fdf5df',
    textColor: '#40300a',
    stampIconColor: '#a87a14',
  },
  clay: {
    primaryColor: '#b4674a',
    secondaryColor: '#fbeee8',
    textColor: '#421f13',
    stampIconColor: '#8d4a32',
  },
  graphite: {
    primaryColor: '#3c434b',
    secondaryColor: '#eef0f2',
    textColor: '#f7f8f9',
    stampIconColor: '#59626c',
  },
  espresso: {
    primaryColor: '#4a3529',
    secondaryColor: '#f5ece5',
    textColor: '#fdf8f3',
    stampIconColor: '#6b4f3f',
  },
  plum: {
    primaryColor: '#5b3a63',
    secondaryColor: '#f3eaf5',
    textColor: '#fdf7ff',
    stampIconColor: '#7b5385',
  },
  navy: {
    primaryColor: '#0d2a4a',
    secondaryColor: '#e4ecf5',
    textColor: '#f6faff',
    stampIconColor: '#1f4771',
  },
  sand: {
    primaryColor: '#efe2cd',
    secondaryColor: '#fffaf1',
    textColor: '#4b3a23',
    stampIconColor: '#a78a5d',
  },
  paper: {
    primaryColor: '#f6f4ef',
    secondaryColor: '#ffffff',
    textColor: '#26323c',
    stampIconColor: '#8b8377',
  },
  linen: {
    primaryColor: '#e8ded2',
    secondaryColor: '#fdf9f4',
    textColor: '#443a2f',
    stampIconColor: '#9c8873',
  },
  blush: {
    primaryColor: '#f7dfe2',
    secondaryColor: '#fff8f9',
    textColor: '#5a333c',
    stampIconColor: '#b97e8b',
  },
  stone: {
    primaryColor: '#dcdfe3',
    secondaryColor: '#f7f8f9',
    textColor: '#333c45',
    stampIconColor: '#8a929b',
  },
  ice: {
    primaryColor: '#ddeef3',
    secondaryColor: '#f8fdff',
    textColor: '#1f3f4a',
    stampIconColor: '#6f9aa5',
  },
};

/** Sellos del selector de la paleta, agrupados por familia. */
export const loyaltyCardThemeGroups: { label: string; themes: LoyaltyCardTheme[] }[] = [
  {
    label: 'Marca Punto Plus',
    themes: [
      'forest',
      'terracotta',
      'lavender',
      'ocean',
      'matcha',
      'citrus',
      'berry',
      'rose',
      'chocolate',
      'sunset',
      'sky',
      'midnight',
    ],
  },
  { label: 'Azules', themes: ['marine', 'denim', 'steel', 'teal', 'aqua', 'sapphire'] },
  { label: 'Verdes', themes: ['sage', 'moss', 'olive', 'pine', 'emerald', 'mint'] },
  { label: 'Cálidos', themes: ['caramel', 'peach', 'coral', 'wine', 'mustard', 'clay'] },
  { label: 'Oscuros', themes: ['graphite', 'espresso', 'plum', 'navy'] },
  { label: 'Claros', themes: ['sand', 'paper', 'linen', 'blush', 'stone', 'ice'] },
];

export const loyaltyCardThemeLabels: Record<LoyaltyCardTheme, string> = {
  forest: 'Bosque',
  terracotta: 'Terracota',
  lavender: 'Lavanda',
  ocean: 'Océano',
  matcha: 'Matcha',
  citrus: 'Cítrico',
  berry: 'Frutos rojos',
  rose: 'Rosa',
  chocolate: 'Cacao',
  sunset: 'Atardecer',
  sky: 'Cielo',
  midnight: 'Medianoche',
  marine: 'Marino',
  denim: 'Mezclilla',
  steel: 'Acero',
  teal: 'Turquesa',
  aqua: 'Aqua',
  sapphire: 'Zafiro',
  sage: 'Salvia',
  moss: 'Musgo',
  olive: 'Oliva',
  pine: 'Pino',
  emerald: 'Esmeralda',
  mint: 'Menta',
  caramel: 'Caramelo',
  peach: 'Durazno',
  coral: 'Coral',
  wine: 'Vino',
  mustard: 'Mostaza',
  clay: 'Barro',
  graphite: 'Grafito',
  espresso: 'Expreso',
  plum: 'Ciruela',
  navy: 'Azul marino',
  sand: 'Arena',
  paper: 'Papel',
  linen: 'Lino',
  blush: 'Rubor',
  stone: 'Piedra',
  ice: 'Hielo',
};

/** ¿Es un color hexadecimal válido (`#rrggbb`)? */
export const hexColorSchema = z.string().regex(/^#[\da-f]{6}$/i, 'Usa un color hexadecimal');
export const optionalHexColorSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
  hexColorSchema.optional(),
);

export function hexToRgbTuple(hex: string): [number, number, number] | null {
  const match = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Tema más cercano a un color de fondo (para negocios guardados antes de la paleta ampliada). */
export function closestThemeTo(color: string): LoyaltyCardTheme | undefined {
  const rgb = hexToRgbTuple(color);
  if (!rgb) return undefined;
  return loyaltyCardThemes
    .map((theme) => {
      const candidate = hexToRgbTuple(loyaltyCardThemeColors[theme].primaryColor)!;
      const distance = rgb.reduce(
        (sum, channel, index) => sum + (channel - candidate[index]) ** 2,
        0,
      );
      return { theme, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.theme;
}

/** Color de tinta legible (claro u oscuro) para un color de fondo. */
export function readableInkColor(background: string) {
  const rgb = hexToRgbTuple(background);
  if (!rgb) return '#f1f5f8';
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#022f53' : '#f1f5f8';
}

export type FoodBrandIcon = (typeof foodBrandIcons)[number];
export type MenuFontFamily = (typeof menuFontFamilies)[number];
const optionalLatitudeSchema = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.number().min(-90).max(90).optional(),
);
const optionalLongitudeSchema = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.coerce.number().min(-180).max(180).optional(),
);
export const cardSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  category: z.string(),
  tagline: z.string(),
  reward: z.string(),
  stamps: z.number().int().nonnegative(),
  goal: z.number().int().min(2).max(12),
  theme: loyaltyCardThemeSchema,
  icon: foodBrandIconSchema,
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  textColor: z.string().optional(),
  /** `stamp_icon_color`: color del icono dentro de los sellos completados. */
  stampIconColor: z.string().optional(),
  cardShape: z.enum(['rounded', 'square', 'circle']).optional(),
  fontFamily: menuFontFamilySchema.optional(),
  location: z.string(),
  address: z.string().optional(),
  latitude: optionalLatitudeSchema,
  longitude: optionalLongitudeSchema,
  distance: z.string(),
  joined: z.boolean(),
  logo: z.string().optional(),
});
export type LoyaltyCard = z.infer<typeof cardSchema>;
export const nearbyBusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string(),
  logo: z.string().optional(),
  background: z.string().optional(),
  latitude: optionalLatitudeSchema,
  longitude: optionalLongitudeSchema,
  address: z.string().optional(),
  location: z.string(),
  distanceKm: z.number().nonnegative().optional(),
  hasCard: z.boolean(),
  activeLoyaltyCardsCount: z.number().int().nonnegative(),
  activePromotionsCount: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
export type NearbyBusiness = z.infer<typeof nearbyBusinessSchema>;
export const promotionSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  business: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  image: z.string(),
  badge: z.string(),
  expires: z.string(),
  type: z.enum(['simple', 'steps', 'direct']).optional(),
  discountType: z.enum(['percentage', 'fixed', 'gift', 'points']).optional(),
  discountTypeLabel: z.string().optional(),
  discountValue: z.number().optional(),
  code: z.string().optional(),
  terms: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional(),
  isActiveNow: z.boolean().optional(),
  maxRedemptions: z.number().optional(),
  redemptionsCount: z.number().optional(),
  loyaltyCardId: z.string().optional(),
  // Sencilla: al completar N compras se regala producto(s).
  purchasesRequired: z.coerce.number().int().min(1).optional(),
  freeProduct: z.string().optional(),
  freeQuantity: z.coerce.number().int().min(1).optional(),
  // Por pasos: beneficios al alcanzar metas de puntos.
  tiers: z
    .array(
      z.object({
        points: z.coerce.number().int().min(1, 'Puntos mínimos requeridos'),
        benefit: z.string().min(1, 'Describe el beneficio'),
      }),
    )
    .optional(),
  // Directas: sin condición, siempre o en días y horas específicos.
  appliesAlways: z.boolean().optional(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});
export type PromotionType = 'simple' | 'steps' | 'direct';
export type Promotion = z.infer<typeof promotionSchema>;
export const adminCategorySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().min(1, 'El nombre de la categoría es obligatorio'),
  icon: z.string().min(1, 'El icono de la categoría es obligatorio'),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export const adminCategoryInputSchema = adminCategorySchema.omit({ id: true });
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;

export const adminBusinessStatusSchema = z.enum(['pending', 'active', 'cancelled', 'onboarding']);
export const adminBusinessSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().optional(),
  status: adminBusinessStatusSchema,
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  membershipActive: z.boolean().optional(),
  membershipExpiresAt: z.string().optional(),
  customerCount: z.number().nonnegative().optional(),
  loyaltyCardCount: z.number().nonnegative().optional(),
  stampsCount: z.number().nonnegative().optional(),
  promotionsCount: z.number().nonnegative().optional(),
  currentMonthCustomerCount: z.number().nonnegative().optional(),
  previousMonthCustomerCount: z.number().nonnegative().optional(),
  currentMonthRevenue: z.number().nonnegative().optional(),
  previousMonthRevenue: z.number().nonnegative().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export const adminBusinessInputSchema = z.object({
  name: z.string().trim().min(2, 'Escribe al menos 2 caracteres'),
  email: z.union([z.string().email('Escribe un correo válido'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  status: adminBusinessStatusSchema,
  membershipExpiresAt: z.string().optional(),
});
const adminBusinessGrowthSchema = z.object({
  month: z.string(),
  businesses: z.number().nonnegative(),
  customers: z.number().nonnegative(),
});
export const adminBusinessStatisticsSchema = z.object({
  currentMonthCustomers: z.number().nonnegative().optional(),
  previousMonthCustomers: z.number().nonnegative().optional(),
  currentMonthRevenue: z.number().nonnegative().optional(),
  previousMonthRevenue: z.number().nonnegative().optional(),
  expiringMemberships: z.number().nonnegative().optional(),
  businesses: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
      inactive: z.number().nonnegative().optional(),
      withoutLoyaltyCards: z.number().nonnegative().optional(),
      newLast30Days: z.number().nonnegative().optional(),
      newThisMonth: z.number().nonnegative().optional(),
      trashed: z.number().nonnegative().optional(),
    })
    .optional(),
  customers: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
      completed: z.number().nonnegative().optional(),
      newLast30Days: z.number().nonnegative().optional(),
    })
    .optional(),
  loyaltyCards: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
      public: z.number().nonnegative().optional(),
    })
    .optional(),
  stamps: z
    .object({
      total: z.number().nonnegative().optional(),
      today: z.number().nonnegative().optional(),
      last30Days: z.number().nonnegative().optional(),
    })
    .optional(),
  promotions: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
    })
    .optional(),
  owners: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
      inactive: z.number().nonnegative().optional(),
    })
    .optional(),
  redemptions: z
    .object({
      total: z.number().nonnegative().optional(),
      today: z.number().nonnegative().optional(),
      last30Days: z.number().nonnegative().optional(),
    })
    .optional(),
  rewards: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
    })
    .optional(),
  products: z
    .object({
      total: z.number().nonnegative().optional(),
      active: z.number().nonnegative().optional(),
    })
    .optional(),
  averages: z
    .object({
      customersPerBusiness: z.number().nonnegative().optional(),
      cardsPerBusiness: z.number().nonnegative().optional(),
      stampsPerCustomer: z.number().nonnegative().optional(),
      redemptionsPerCustomer: z.number().nonnegative().optional(),
    })
    .optional(),
  growth: z.array(adminBusinessGrowthSchema).optional(),
});
export const adminBusinessPaginationSchema = z.object({
  currentPage: z.number().int().positive().optional(),
  lastPage: z.number().int().positive().optional(),
  perPage: z.number().int().positive().optional(),
  total: z.number().nonnegative().optional(),
});
export const adminBusinessReportSchema = z.object({
  businesses: z.array(adminBusinessSchema),
  statistics: adminBusinessStatisticsSchema.optional(),
  pagination: adminBusinessPaginationSchema.optional(),
});
export const adminBusinessEmailSchema = z.object({
  type: z.enum(['reminder', 'thank_you', 'follow_up']),
  subject: z.string().trim().min(3, 'Escribe un asunto'),
  message: z.string().trim().min(10, 'Escribe un mensaje de al menos 10 caracteres'),
});
export type AdminBusiness = z.infer<typeof adminBusinessSchema>;
export type AdminBusinessInput = z.infer<typeof adminBusinessInputSchema>;
export type AdminBusinessReport = z.infer<typeof adminBusinessReportSchema>;
export type AdminBusinessEmail = z.infer<typeof adminBusinessEmailSchema>;

export const activitySchema = z.object({
  id: z.string(),
  business: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.enum(['stamp', 'reward', 'join']),
  amount: z.number(),
});
export type Activity = z.infer<typeof activitySchema>;
export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'El plato necesita un nombre'),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]).transform(String).optional(),
  category: z.string().optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  popular: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  orderCount: z.coerce.number().nonnegative().optional(),
  ordersCount: z.coerce.number().nonnegative().optional(),
  available: z.boolean().optional(),
});
export const publicMenuSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  slug: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  categories: z.array(z.string()).default([]),
  categoryDetails: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
      }),
    )
    .optional(),
  menuItems: z.array(menuItemSchema).default([]),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  phoneNumbers: z.array(z.string()).optional(),
  welcomeMessage: z.string().optional(),
  serviceDays: z.array(z.number().int().min(0).max(6)).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  deliveryAvailable: z.boolean().optional(),
  allowOrders: z.boolean().optional(),
  fontFamily: menuFontFamilySchema.optional(),
  menuStyle: z.enum(['cozy', 'compact']).optional(),
  openingHours: z.string().optional(),
});
export type PublicMenu = z.infer<typeof publicMenuSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
/** Categorías de comida que el negocio puede vender. */
export const foodCategories = [
  'Cafetería',
  'Desayuno',
  'Comida',
  'Cena',
  'Bebidas calientes',
  'Bebidas frías',
  'Tacos y antojitos',
  'Pizza y pasta',
  'Hamburguesas',
  'Sushi',
  'Mariscos',
  'Vegetariano',
  'Vegano',
  'Repostería',
  'Otro',
] as const;
export type FoodCategory = (typeof foodCategories)[number];
export const businessSchema = z.object({
  // El backend puede devolver un negocio recién creado con `name: null`.
  // Se representa como cadena vacía para que el asistente permita completarlo.
  name: z.string().min(2, 'Escribe al menos 2 caracteres').or(z.literal('')),
  reward: z.string().min(3, 'Describe tu recompensa'),
  goal: z.coerce.number().int().min(2, 'Mínimo 2 sellos').max(12, 'Máximo 12 sellos'),
  theme: loyaltyCardThemeSchema,
  icon: foodBrandIconSchema,
  cardPrimaryColor: z.string().optional(),
  cardSecondaryColor: z.string().optional(),
  cardTextColor: z.string().optional(),
  cardStampIconColor: optionalHexColorSchema,
  cardShape: z.enum(['rounded', 'square', 'circle']).optional(),
  loyaltyCardId: z.string().optional(),
  loyaltyCardSettings: z.record(z.string(), z.unknown()).optional(),
  loyaltyCards: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
  categories: z.array(z.string()).default([]),
  menuImage: z.string().optional(),
  menuItems: z.array(menuItemSchema).default([]),
  /** Colores extraídos del logo para el menú digital y el QR. */
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  qrForeground: z.string().optional(),
  qrBackground: z.string().optional(),
  qrEyeColor: z.string().optional(),
  qrContent: z.string().optional(),
  qrLogo: z.string().optional(),
  qrBodyStyle: z
    .enum(['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'])
    .optional(),
  qrEyeFrameStyle: z
    .enum(['square', 'dot', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'])
    .optional(),
  qrEyeStyle: z
    .enum(['square', 'dot', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'])
    .optional(),
  qrSize: z.number().int().min(256).max(2048).optional(),
  onboarded: z.boolean().optional(),
  welcomeMessage: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  phoneNumbers: z.array(z.string()).optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  serviceDays: z.array(z.number().int().min(0).max(6)).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  openingHours: z.string().optional(),
  deliveryAvailable: z.boolean().optional(),
  allowOrders: z.boolean().optional(),
  fontFamily: menuFontFamilySchema.optional(),
  menuStyle: z.enum(['cozy', 'compact']).optional(),
});
export type BusinessConfig = z.infer<typeof businessSchema>;
export const businessQRConfigurationSchema = z.object({
  content: z.string().trim().min(1),
  foreground: z.string().regex(/^#[\da-f]{6}$/i),
  background: z.string().regex(/^#[\da-f]{6}$/i),
  eyeColor: z.string().regex(/^#[\da-f]{6}$/i),
  logo: z.string().optional(),
  bodyStyle: z.enum(['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded']),
  eyeFrameStyle: z.enum([
    'square',
    'dot',
    'dots',
    'rounded',
    'extra-rounded',
    'classy',
    'classy-rounded',
  ]),
  eyeStyle: z.enum([
    'square',
    'dot',
    'dots',
    'rounded',
    'extra-rounded',
    'classy',
    'classy-rounded',
  ]),
  size: z.number().int().min(256).max(2048),
});
export type BusinessQRConfiguration = z.infer<typeof businessQRConfigurationSchema>;
export interface LogoAnalysis {
  primary: string;
  secondary: string;
  qrForeground: string;
  qrBackground: string;
  palette: string[];
}
