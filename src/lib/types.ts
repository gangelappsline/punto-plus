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
  price: z.string().optional(),
  category: z.string().optional(),
});
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
  name: z.string().min(2, 'Escribe al menos 2 caracteres'),
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
  onboarded: z.boolean().optional(),
});
export type BusinessConfig = z.infer<typeof businessSchema>;
export interface LogoAnalysis {
  primary: string;
  secondary: string;
  qrForeground: string;
  qrBackground: string;
  palette: string[];
}
