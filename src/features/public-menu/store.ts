/**
 * Carrito del menú público (`/menu/<slug>`).
 *
 * Se guarda en `localStorage` por negocio para que el cliente pueda cerrar el
 * navegador y volver: no requiere iniciar sesión ni pasa por la API. El pedido
 * final se arma como un mensaje de WhatsApp con el total y las notas.
 */
import { create } from 'zustand';
import { cartCount, type CartState } from '../../lib/publicMenu';

const STORAGE_PREFIX = 'punto-plus-public-cart-v1:';
const EMPTY: CartState = {};

function read(slug: string): CartState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const cart: CartState = {};
    for (const [id, line] of Object.entries(parsed as Record<string, unknown>)) {
      const value = line as { quantity?: unknown; note?: unknown };
      const quantity = Math.floor(Number(value?.quantity));
      if (!id || !Number.isFinite(quantity) || quantity <= 0) continue;
      cart[id] = { quantity: Math.min(quantity, 99), note: String(value?.note ?? '') };
    }
    return cart;
  } catch {
    return {};
  }
}

function write(slug: string, cart: CartState) {
  try {
    if (Object.keys(cart).length)
      localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(cart));
    else localStorage.removeItem(`${STORAGE_PREFIX}${slug}`);
  } catch {
    /* Sin almacenamiento el carrito vive solo en memoria. */
  }
}

interface CartStore {
  slug: string;
  cart: CartState;
  /** Carga el carrito guardado del negocio (al cambiar de menú). */
  hydrate: (slug: string) => void;
  add: (id: string, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  setNote: (id: string, note: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const usePublicCart = create<CartStore>((set, get) => {
  const update = (next: CartState) => {
    write(get().slug, next);
    set({ cart: next });
  };
  return {
    slug: '',
    cart: EMPTY,
    hydrate: (slug) => set({ slug, cart: read(slug) }),
    add: (id, quantity = 1) => {
      const current = get().cart[id] ?? { quantity: 0, note: '' };
      update({
        ...get().cart,
        [id]: { ...current, quantity: Math.min(current.quantity + quantity, 99) },
      });
    },
    setQuantity: (id, quantity) => {
      const cart = { ...get().cart };
      if (quantity <= 0) delete cart[id];
      else
        cart[id] = { ...(cart[id] ?? { note: '' }), quantity: Math.min(Math.floor(quantity), 99) };
      update(cart);
    },
    setNote: (id, note) => {
      const current = get().cart[id];
      if (!current) return;
      update({ ...get().cart, [id]: { ...current, note } });
    },
    remove: (id) => {
      const cart = { ...get().cart };
      delete cart[id];
      update(cart);
    },
    clear: () => update({}),
  };
});

/** Carrito del negocio indicado; referencia estable si todavía no se cargó. */
export function useCartFor(slug: string) {
  return usePublicCart((state) => (state.slug === slug ? state.cart : EMPTY));
}

/** Total de piezas del negocio indicado. */
export function useCartCount(slug: string): number {
  return cartCount(useCartFor(slug));
}
