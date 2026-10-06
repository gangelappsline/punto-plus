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
});
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
export const businessSchema = z.object({
  name: z.string().min(2, 'Escribe al menos 2 caracteres'),
  reward: z.string().min(3, 'Describe tu recompensa'),
  goal: z.coerce.number().int().min(2, 'Mínimo 2 sellos').max(12, 'Máximo 12 sellos'),
  theme: z.enum(['forest', 'terracotta', 'lavender']),
  icon: z.enum(['coffee', 'bread', 'leaf']),
  logo: z.string().optional(),
});
export type BusinessConfig = z.infer<typeof businessSchema>;
