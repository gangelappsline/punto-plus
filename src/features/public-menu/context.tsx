/**
 * Contexto del menú público: negocio, tema, carrito y acciones compartidas.
 *
 * Las subpantallas (`/menu/<slug>/menu`, `/platillo/<slug>`, `/carrito`) viven
 * dentro del mismo `PublicMenuLayout`, así que leen el negocio de una sola
 * consulta a TanStack Query y no vuelven a pedirlo al navegar.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MenuItem, PublicMenu } from '../../lib/types';
import { cartLines, cartSubtotal, type CartLine, type CartState } from '../../lib/publicMenu';
import type { PublicMenuTheme } from './theme';

export interface PublicMenuContextValue {
  business: PublicMenu;
  slug: string;
  theme: PublicMenuTheme;
  /** Nombre de la empresa tal como se muestra (recortado). */
  name: string;
  items: MenuItem[];
  orderable: boolean;
  cart: CartState;
  lines: CartLine[];
  subtotal: number;
  count: number;
  add: (item: MenuItem, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  setNote: (id: string, note: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Abre la hoja «agregar al pedido»; si no la hay, suma una pieza. */
  openDish: (item: MenuItem) => void;
  /** Categorías del negocio con su emoji, en orden y sin repetir. */
  categories: { name: string; emoji: string }[];
}

const PublicMenuContext = createContext<PublicMenuContextValue | null>(null);

export function PublicMenuProvider({
  value,
  children,
}: {
  value: PublicMenuContextValue;
  children: ReactNode;
}) {
  return <PublicMenuContext.Provider value={value}>{children}</PublicMenuContext.Provider>;
}

export function usePublicMenu() {
  const context = useContext(PublicMenuContext);
  if (!context) throw new Error('usePublicMenu debe usarse dentro de PublicMenuProvider');
  return context;
}

/** Líneas y subtotal del carrito, memorizados por contenido. */
export function useCartTotals(items: MenuItem[], cart: CartState) {
  return useMemo(() => {
    const lines = cartLines(items, cart);
    return { lines, subtotal: cartSubtotal(lines) };
  }, [items, cart]);
}
