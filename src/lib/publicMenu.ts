/**
 * Utilidades del menú público (`/menu/<slug>`).
 *
 * La pantalla se apoya solo en lo que ya devuelve `public/business/<slug>`:
 * platillos, categorías, colores y datos de contacto del negocio. Aquí viven
 * las conversiones de precio, los enlaces internos, los emojis de categoría y
 * el armado del pedido por WhatsApp, para que los componentes queden delgados.
 */
import type { MenuItem, OrderMode, PublicMenu } from './types';
import { businessSlug } from './utils';

/** Moneda del menú. Se muestra el entero grande y los centavos en pequeño. */
export const menuCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

const wholeCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export interface PriceParts {
  /** Parte entera con símbolo, por ejemplo `$119`. */
  whole: string;
  /** Centavos sin separador, por ejemplo `00`. */
  cents: string;
}

/** Precio numérico del platillo (`"45"`, `45`, `"$45.00"`). */
export function itemAmount(item: MenuItem): number {
  const raw = item.price;
  if (raw === undefined || raw === '') return 0;
  const amount = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

/** Precio listo para pintar; `null` cuando el platillo no tiene precio. */
export function priceParts(item: MenuItem): PriceParts | null {
  if (item.price === undefined || item.price === '') return null;
  const amount = itemAmount(item);
  if (!Number.isFinite(amount) || !String(item.price).match(/\d/)) {
    return { whole: String(item.price), cents: '' };
  }
  const cents = Math.round(amount * 100) % 100;
  return { whole: wholeCurrency.format(Math.floor(amount)), cents: String(cents).padStart(2, '0') };
}

/** Precio en texto (`$45.00`) para totales y mensajes. */
export function formatPrice(amount: number): string {
  return menuCurrency.format(amount);
}

/** Nombre legible para URL: minúsculas, sin acentos y con guiones. */
export function slugOf(value: string, fallback = ''): string {
  const slug = businessSlug(value);
  // Un nombre solo de emojis produce el marcador `mi-menu`: se usa el respaldo.
  return slug === 'mi-menu' ? fallback || slug : slug;
}

export function dishSlug(item: MenuItem): string {
  return slugOf(item.name, item.id);
}

export function categorySlug(name: string): string {
  return slugOf(name);
}

/** Ruta del platillo dentro del menú del negocio. */
export function dishHref(slug: string, item: MenuItem): string {
  return `/menu/${encodeURIComponent(slug)}/platillo/${encodeURIComponent(dishSlug(item))}`;
}

export function categoryHref(slug: string, name: string): string {
  return `/menu/${encodeURIComponent(slug)}/categoria/${encodeURIComponent(categorySlug(name))}`;
}

export function cartHref(slug: string): string {
  return `/menu/${encodeURIComponent(slug)}/carrito`;
}

export function catalogHref(slug: string, category?: string): string {
  const base = `/menu/${encodeURIComponent(slug)}/menu`;
  return category ? `${base}?cat=${encodeURIComponent(categorySlug(category))}` : base;
}

/** Busca un platillo por su slug de nombre y, si no, por id. */
export function findDish(items: MenuItem[], value: string): MenuItem | undefined {
  const normalized = value.toLocaleLowerCase('es-MX');
  return (
    items.find((item) => dishSlug(item) === normalized) ??
    items.find((item) => item.id === value) ??
    items.find((item) => dishSlug(item).startsWith(normalized))
  );
}

/** Saludo según la hora del día, como en el menú de referencia. */
export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return '¡Buenos días!';
  if (hour < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

const categoryEmojis: [RegExp, string][] = [
  [/desayun|brunch|huevo/, '🍳'],
  [/carn|parril|asador|steak|res|cerdo/, '🥩'],
  [/pizza/, '🍕'],
  [/hamburg|burger|sandwich|sándwich/, '🍔'],
  [/sushi|asian|asiátic|japones|ramen|wok/, '🍜'],
  [/mexican|taco|antoj|quesadilla|tortilla/, '🌮'],
  [/pasta|italian|spaghetti|lasaña/, '🍝'],
  [/bebida|drink|jugo|agua|refresco|coctel|coctél/, '🍹'],
  [/caf|espresso|capuchino|latte/, '☕'],
  [/postre|dulce|reposter|pastel|panader|pan |dona|galleta/, '🍰'],
  [/marisco|pescado|sushi|ceviche|camarón|camaron/, '🦐'],
  [/vegetar|vegan|ensalada|saludable|verde/, '🥗'],
  [/sopa|caldo|crema/, '🍲'],
  [/helado|nieve|paleta/, '🍦'],
  [/vino|cerveza|bar/, '🍷'],
  [/cena|noche/, '🌙'],
  [/comida|almuerzo|menú|menu|especialidad/, '🍽️'],
];

/** Emoji temático para la categoría; si no hay coincidencia, un plato. */
export function categoryEmoji(name: string): string {
  const normalized = name.toLocaleLowerCase('es-MX');
  return categoryEmojis.find(([pattern]) => pattern.test(normalized))?.[1] ?? '🍴';
}

/** Imagen del platillo con respaldo por categoría, como en el menú anterior. */
export function itemImage(item: MenuItem): string {
  if (item.image || item.imageUrl) return item.image || item.imageUrl!;
  const category = item.category?.toLowerCase() ?? '';
  if (/pan|postre|reposter|pastel|dulce/.test(category)) return '/images/bakery.webp';
  if (/matcha|té|te|bebida/.test(category)) return '/images/matcha.webp';
  return '/images/coffee.webp';
}

/** Distintivos visibles del platillo (nuevo, recomendado, agotado, stock bajo). */
export function itemBadges(item: MenuItem): string[] {
  const badges: string[] = [];
  if (item.isNew) badges.push('Nuevo');
  if (item.popular || item.isPopular) badges.push('Recomendado');
  if (typeof item.stock === 'number') {
    if (item.stock === 0) badges.push('Agotado');
    else if (item.stock <= 10) badges.push(`Quedan ${item.stock}`);
  }
  return badges;
}

/** El platillo se puede pedir: disponible y con existencias. */
export function isOrderable(item: MenuItem): boolean {
  return item.available !== false && item.stock !== 0;
}

/**
 * Los platillos más pedidos del negocio. Si nadie marcó favoritos, se usan los
 * primeros del menú para que la sección nunca quede vacía.
 */
export function popularItems(items: MenuItem[], limit = 8): MenuItem[] {
  const ranked = items
    .filter(
      (item) => item.popular || item.isPopular || (item.orderCount ?? item.ordersCount ?? 0) > 0,
    )
    .sort((a, b) => (b.orderCount ?? b.ordersCount ?? 0) - (a.orderCount ?? a.ordersCount ?? 0));
  return (ranked.length ? ranked : items).slice(0, limit);
}

export type CartState = Record<string, { quantity: number; note: string }>;

export interface CartLine {
  item: MenuItem;
  quantity: number;
  note: string;
  total: number;
}

/** Líneas del pedido en el orden del menú (y sin platillos eliminados). */
export function cartLines(items: MenuItem[], cart: CartState): CartLine[] {
  return items
    .filter((item) => (cart[item.id]?.quantity ?? 0) > 0)
    .map((item) => {
      const line = cart[item.id];
      return {
        item,
        quantity: line.quantity,
        note: line.note.trim(),
        total: itemAmount(item) * line.quantity,
      };
    });
}

export function cartCount(cart: CartState): number {
  return Object.values(cart).reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.total, 0);
}

/** Costo de envío configurado por el negocio (solo si el pedido es a domicilio). */
export function deliveryFeeFor(business: PublicMenu, mode: OrderMode | null): number {
  if (mode !== 'delivery' || !business.deliveryFee) return 0;
  const fee = Number(String(business.deliveryFee).replace(/[^\d.]/g, ''));
  return Number.isFinite(fee) ? fee : 0;
}

export const orderModeLabels: Record<OrderMode, string> = {
  pickup: 'Para llevar',
  delivery: 'A domicilio',
  dinein: 'En el local',
};

/** Teléfono de WhatsApp del negocio, si lo tiene. */
export function businessPhone(business: PublicMenu): string | null {
  const phone = business.phoneNumbers?.find((value) => value.trim()) ?? business.phone ?? '';
  return phone.replace(/\D/g, '') ? phone : null;
}

export function whatsAppHref(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function contactMessage(business: PublicMenu): string {
  return `¡Hola ${business.name}! 👋 Vi su menú digital y tengo una pregunta.`;
}

export interface OrderMessageInput {
  business: PublicMenu;
  lines: CartLine[];
  mode: OrderMode | null;
  customerName: string;
  deliveryFee: number;
}

/** Pedido completo listo para enviarse por WhatsApp. */
export function orderMessage({
  business,
  lines,
  mode,
  customerName,
  deliveryFee,
}: OrderMessageInput): string {
  const subtotal = cartSubtotal(lines);
  const total = subtotal + deliveryFee;
  const rows = lines.map(
    (line) =>
      `• ${line.quantity}× ${line.item.name} — ${formatPrice(line.total)}${
        line.note ? `\n   Nota: ${line.note}` : ''
      }`,
  );
  const details = [
    `¡Hola ${business.name}! 👋`,
    'Quiero hacer este pedido:',
    '',
    ...rows,
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    ...(deliveryFee ? [`Envío: ${formatPrice(deliveryFee)}`] : []),
    `Total: ${formatPrice(total)}`,
    '',
    ...(mode ? [`Entrega: ${orderModeLabels[mode]}`] : []),
    ...(customerName.trim() ? [`Nombre: ${customerName.trim()}`] : []),
    '',
    'Enviado desde su menú digital de Punto Plus.',
  ];
  return details.join('\n');
}
