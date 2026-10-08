import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { User } from './types';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
/**
 * Modo de datos. Por defecto la aplicación consume la **API real**; el modo
 * demo (fixtures locales, sin backend) queda como una opción explícita de
 * desarrollo: `VITE_DATA_MODE=demo`.
 */
export const isDemo = import.meta.env.VITE_DATA_MODE === 'demo';
/** Cada panel es un layout independiente con su propia ruta raíz. */
export type Panel = 'customer' | 'business';
/** Raíz del panel que le corresponde a cada rol. */
export function panelPathFor(role?: User['role'] | string | null) {
  return role === 'business' || role === 'admin' ? '/admin' : '/app';
}
/** Panel al que pertenece una ruta, o `null` si es pública. */
export function panelForPath(pathname: string): Panel | null {
  if (pathname.startsWith('/admin')) return 'business';
  if (pathname.startsWith('/app')) return 'customer';
  return null;
}
/** ¿El rol de la sesión tiene acceso a este panel? */
export function panelAllows(panel: Panel, role?: User['role'] | string | null) {
  if (!role) return false;
  return panel === 'business' ? role === 'business' || role === 'admin' : role === 'customer';
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo.';
}
