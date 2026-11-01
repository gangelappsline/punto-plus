import { z } from 'zod';
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['customer', 'business', 'admin']),
});
export type User = z.infer<typeof userSchema>;
export const cardSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  category: z.string(),
  tagline: z.string(),
  reward: z.string(),
  stamps: z.number().int().nonnegative(),
  goal: z.number().int().min(2).max(12),
  theme: z.enum(['forest', 'terracotta', 'lavender']),
  icon: z.enum(['coffee', 'bread', 'leaf']),
  location: z.string(),
  distance: z.string(),
  joined: z.boolean(),
  logo: z.string().optional(),
});
export type LoyaltyCard = z.infer<typeof cardSchema>;
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
  email: z.string().optional(),
  phone: z.string().optional(),
  status: adminBusinessStatusSchema,
  membershipActive: z.boolean().optional(),
  membershipExpiresAt: z.string().optional(),
  customerCount: z.number().nonnegative().optional(),
  currentMonthCustomerCount: z.number().nonnegative().optional(),
  previousMonthCustomerCount: z.number().nonnegative().optional(),
  currentMonthRevenue: z.number().nonnegative().optional(),
  previousMonthRevenue: z.number().nonnegative().optional(),
  createdAt: z.string().optional(),
});
export const adminBusinessInputSchema = z.object({
  name: z.string().trim().min(2, 'Escribe al menos 2 caracteres'),
  email: z.union([z.string().email('Escribe un correo válido'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  status: adminBusinessStatusSchema,
  membershipExpiresAt: z.string().optional(),
});
export const adminBusinessStatisticsSchema = z.object({
  currentMonthCustomers: z.number().nonnegative().optional(),
  previousMonthCustomers: z.number().nonnegative().optional(),
  currentMonthRevenue: z.number().nonnegative().optional(),
  previousMonthRevenue: z.number().nonnegative().optional(),
  expiringMemberships: z.number().nonnegative().optional(),
});
export const adminBusinessReportSchema = z.object({
  businesses: z.array(adminBusinessSchema),
  statistics: adminBusinessStatisticsSchema.optional(),
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
  fontFamily: z.enum(['dm-sans', 'manrope', 'serif']).optional(),
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
  theme: z.enum(['forest', 'terracotta', 'lavender']),
  icon: z.enum(['coffee', 'bread', 'leaf']),
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
  fontFamily: z.enum(['dm-sans', 'manrope', 'serif']).optional(),
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
