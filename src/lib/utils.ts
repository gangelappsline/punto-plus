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

/** URL pública de la SPA; facilita generar enlaces de menú con dominio personalizado. */
export function getAppBaseUrl() {
  return (import.meta.env.VITE_BASE_APP_URL || window.location.origin).replace(/\/+$/, '');
}

/** Enlace legible del negocio: minúsculas, sin acentos y con guiones. */
export function businessSlug(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mi-menu'
  );
}

export function publicMenuUrl(slug: string) {
  return `${getAppBaseUrl()}/${encodeURIComponent(slug)}`;
}

/** Cada panel es un layout independiente con su propia ruta raíz. */
export type Panel = 'customer' | 'business' | 'admin';
/** Ruta raíz del layout asignado a cada rol. */
export function panelPathFor(role?: User['role'] | string | null) {
  const panel = panelRole(role);
  return panel === 'business' ? '/business' : panel === 'admin' ? '/admin' : '/app';
}
/** Panel al que pertenece una ruta, o `null` si es pública. */
export function panelForPath(pathname: string): Panel | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/business')) return 'business';
  if (pathname.startsWith('/app')) return 'customer';
  return null;
}
/**
 * Rol del panel al que pertenece cada sesión.
 *
 * El backend (y las sesiones guardadas en versiones anteriores) puede devolver
 * `customer`, `cliente` o `client` para la misma cuenta: todos son el panel del
 * cliente. Sin esta equivalencia el guard redirigía a la misma ruta en bucle y
 * el panel quedaba en blanco.
 */
export function panelRole(role?: User['role'] | string | null): Panel | null {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (['business', 'negocio', 'merchant', 'owner', 'empresa'].includes(value)) return 'business';
  if (['admin', 'administrator', 'administrador', 'superadmin', 'super-admin'].includes(value))
    return 'admin';
  if (!value) return null;
  // Igual que `normalizeRole`: cualquier otra cuenta es de cliente.
  return 'customer';
}

/** ¿El rol de la sesión tiene acceso a este panel? */
export function panelAllows(panel: Panel, role?: User['role'] | string | null) {
  return panelRole(role) === panel;
}
/** Distancia legible para la sección "Cerca de mí". */
export function formatDistanceKm(distanceKm?: number) {
  if (distanceKm === undefined || !Number.isFinite(distanceKm)) return 'Distancia no disponible';
  if (distanceKm < 0.05) return 'Muy cerca';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo.';
}
