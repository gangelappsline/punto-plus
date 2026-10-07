import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const isDemo = import.meta.env.VITE_DATA_MODE !== 'api';
export function panelPathFor(role?: string) {
  return role === 'business' || role === 'admin' ? '/admin' : '/app';
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo de nuevo.';
}
