import type { BusinessConfig, MenuItem } from './types';
import { resolveMenuDesign, type MenuDesign } from './menuStyles';

/**
 * «Crea tu menú en un minuto».
 *
 * Replica el flujo de armado rápido de menús: el negocio elige qué vende y su
 * menú se va armando con cada respuesta, viendo a la derecha cómo lo verán sus
 * clientes. Aquí vive el catálogo base (`businessTypes`), el estado del borrador
 * y la traducción a `BusinessConfig`, para que la pantalla solo se encargue de
 * la interfaz.
 */

export interface BankItem {
  name: string;
  price: number;
  description?: string;
  popular?: boolean;
  /** Cuántas piezas quedan ese día; se muestra como «Quedan N». */
  stock?: number;
}

export interface BankCategory {
  name: string;
  items: BankItem[];
}

export interface BusinessType {
  id: string;
  label: string;
  emoji: string;
  tagline: string;
  categories: BankCategory[];
}

/**
 * Catálogo de arranque por giro. Los precios son sugerencias en pesos: el
 * negocio los ajusta en el paso «Tus productos».
 */
export const businessTypes: BusinessType[] = [
  {
    id: 'tacos',
    label: 'Taquería',
    emoji: '🌮',
    tagline: 'Tacos, especialidades y aguas frescas',
    categories: [
      {
        name: 'Tacos',
        items: [
          {
            name: 'Pastor',
            price: 22,
            description: 'Con piña, cebolla y cilantro',
            popular: true,
            stock: 40,
          },
          {
            name: 'Suadero',
            price: 22,
            description: 'Suave y jugoso, con salsa verde',
            popular: true,
            stock: 25,
          },
          { name: 'Bistec', price: 24, description: 'A la plancha con cebollita asada', stock: 12 },
          { name: 'Campechano', price: 25, description: 'Suadero con longaniza' },
        ],
      },
      {
        name: 'Especialidades',
        items: [
          {
            name: 'Gringa',
            price: 65,
            description: 'Tortilla de harina, pastor y queso gratinado',
            popular: true,
          },
          { name: 'Volcán', price: 38, description: 'Tostada con queso fundido y bistec' },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Agua de horchata', price: 30, description: 'Medio litro', popular: true },
          { name: 'Refresco', price: 28, description: 'Lata 355 ml' },
        ],
      },
    ],
  },
  {
    id: 'pizzas',
    label: 'Pizzería',
    emoji: '🍕',
    tagline: 'Pizzas al horno, entradas y bebidas',
    categories: [
      {
        name: 'Pizzas',
        items: [
          { name: 'Margarita', price: 149, description: 'Orilla rellena de queso', popular: true },
          { name: 'Pepperoni', price: 169, description: 'La favorita de la casa', popular: true },
          { name: 'Hawaiana', price: 175, description: 'Jamón y piña' },
          { name: 'Cuatro quesos', price: 189, description: 'Mozzarella, parmesano, gouda y azul' },
        ],
      },
      {
        name: 'Entradas',
        items: [
          { name: 'Pan de ajo', price: 55, description: 'Con queso gratinado' },
          { name: 'Alitas', price: 95, description: 'BBQ o búfalo' },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Refresco 2 L', price: 45 },
          { name: 'Agua natural', price: 25 },
        ],
      },
    ],
  },
  {
    id: 'hamburguesas',
    label: 'Hamburguesería',
    emoji: '🍔',
    tagline: 'Hamburguesas, papas y malteadas',
    categories: [
      {
        name: 'Hamburguesas',
        items: [
          {
            name: 'Sencilla',
            price: 75,
            description: 'Carne 120 g, queso y vegetales',
            popular: true,
          },
          { name: 'Doble', price: 95, description: 'Doble carne y doble queso', popular: true },
          { name: 'BBQ tocino', price: 105, description: 'Salsa BBQ y tocino crujiente' },
          { name: 'Pollo crispy', price: 90, description: 'Pechuga empanizada' },
        ],
      },
      {
        name: 'Acompañamientos',
        items: [
          { name: 'Papas a la francesa', price: 45, popular: true },
          { name: 'Aros de cebolla', price: 50 },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Malteada', price: 55, description: 'Vainilla, chocolate o fresa' },
          { name: 'Refresco', price: 28 },
        ],
      },
    ],
  },
  {
    id: 'cafe',
    label: 'Cafetería',
    emoji: '☕',
    tagline: 'Café de especialidad y pan recién hecho',
    categories: [
      {
        name: 'Café',
        items: [
          { name: 'Americano', price: 35, popular: true },
          {
            name: 'Capuchino',
            price: 45,
            description: 'Doble espresso y leche vaporizada',
            popular: true,
          },
          { name: 'Latte', price: 50 },
          { name: 'Espresso', price: 30 },
        ],
      },
      {
        name: 'Panadería',
        items: [
          { name: 'Croissant', price: 38, popular: true },
          { name: 'Concha', price: 22 },
        ],
      },
      {
        name: 'Bebidas frías',
        items: [
          { name: 'Frappé de café', price: 60 },
          { name: 'Matcha frío', price: 55 },
        ],
      },
    ],
  },
  {
    id: 'comida',
    label: 'Comida corrida',
    emoji: '🍲',
    tagline: 'Menú del día, guisados y aguas frescas',
    categories: [
      {
        name: 'Comida corrida',
        items: [
          {
            name: 'Menú del día',
            price: 95,
            description: 'Sopa, guisado, tortillas y agua',
            popular: true,
          },
          { name: 'Milanesa', price: 110, description: 'Con arroz y ensalada', popular: true },
          { name: 'Pollo en mole', price: 115, description: 'Receta de la casa' },
        ],
      },
      {
        name: 'Entradas',
        items: [
          { name: 'Sopa del día', price: 35 },
          { name: 'Arroz rojo', price: 25 },
        ],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Agua fresca', price: 25, description: 'Jamaica, horchata o limón' }],
      },
    ],
  },
  {
    id: 'mariscos',
    label: 'Marisquería',
    emoji: '🦐',
    tagline: 'Aguachiles, ceviches y cocteles',
    categories: [
      {
        name: 'Mariscos',
        items: [
          {
            name: 'Aguachile verde',
            price: 145,
            description: 'Camarón fresco y chile serrano',
            popular: true,
          },
          { name: 'Ceviche de pescado', price: 130, popular: true },
          { name: 'Camarones a la plancha', price: 165 },
        ],
      },
      {
        name: 'Para compartir',
        items: [
          { name: 'Torre de mariscos', price: 320, description: 'Para 3 o 4 personas' },
          { name: 'Coctel campechana', price: 120 },
        ],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Chelada', price: 45 }],
      },
    ],
  },
  {
    id: 'alitas',
    label: 'Alitas y boneless',
    emoji: '🍗',
    tagline: 'Alitas, boneless y papas gajo',
    categories: [
      {
        name: 'Alitas',
        items: [
          { name: 'Alitas BBQ 10 pzas', price: 155, popular: true },
          { name: 'Boneless búfalo', price: 145, popular: true },
          { name: 'Alitas mango habanero', price: 155, description: 'Pica de verdad' },
        ],
      },
      {
        name: 'Complementos',
        items: [
          { name: 'Papas gajo', price: 55 },
          { name: 'Aderezo extra', price: 15 },
        ],
      },
      {
        name: 'Bebidas',
        items: [
          { name: 'Refresco', price: 28 },
          { name: 'Cerveza', price: 45 },
        ],
      },
    ],
  },
  {
    id: 'sushi',
    label: 'Sushi',
    emoji: '🍣',
    tagline: 'Rollos, nigiri y té verde',
    categories: [
      {
        name: 'Rollos',
        items: [
          { name: 'California', price: 95, popular: true },
          { name: 'Empanizado', price: 110, popular: true },
          { name: 'Spicy tuna', price: 125, description: 'Con salsa picante de la casa' },
        ],
      },
      {
        name: 'Nigiri',
        items: [
          { name: 'Salmón', price: 45 },
          { name: 'Atún', price: 45 },
        ],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Té verde', price: 30 }],
      },
    ],
  },
  {
    id: 'postres',
    label: 'Postres',
    emoji: '🧁',
    tagline: 'Pasteles, helados y café',
    categories: [
      {
        name: 'Postres',
        items: [
          { name: 'Rebanada de pastel', price: 55, popular: true },
          { name: 'Cheesecake', price: 60, popular: true },
          { name: 'Brownie', price: 45, description: 'Con nuez' },
        ],
      },
      {
        name: 'Helados',
        items: [
          { name: 'Nieve una bola', price: 35 },
          { name: 'Malteada', price: 55 },
        ],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Café americano', price: 30 }],
      },
    ],
  },
  {
    id: 'pan',
    label: 'Panadería',
    emoji: '🥐',
    tagline: 'Pan dulce, pan salado y café de olla',
    categories: [
      {
        name: 'Pan dulce',
        items: [
          { name: 'Concha', price: 22, popular: true },
          { name: 'Oreja', price: 20 },
          { name: 'Cuernito', price: 25 },
        ],
      },
      {
        name: 'Pan salado',
        items: [
          { name: 'Baguette', price: 45, popular: true },
          { name: 'Bolillo', price: 8 },
        ],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Café de olla', price: 30 }],
      },
    ],
  },
  {
    id: 'bar',
    label: 'Bar',
    emoji: '🍹',
    tagline: 'Cocteles, cervezas y botanas',
    categories: [
      {
        name: 'Cocteles',
        items: [
          { name: 'Margarita', price: 95, popular: true },
          { name: 'Mojito', price: 90, popular: true },
          { name: 'Paloma', price: 85 },
        ],
      },
      {
        name: 'Cervezas',
        items: [
          { name: 'Artesanal', price: 65 },
          { name: 'Lager', price: 45 },
        ],
      },
      {
        name: 'Botanas',
        items: [
          { name: 'Alitas', price: 120 },
          { name: 'Papas a la francesa', price: 50 },
        ],
      },
    ],
  },
  {
    id: 'otro',
    label: 'Otro',
    emoji: '🍽️',
    tagline: 'Arma tu catálogo desde cero',
    categories: [
      {
        name: 'Entradas',
        items: [{ name: 'Entrada de la casa', price: 50, popular: true }],
      },
      {
        name: 'Platos fuertes',
        items: [{ name: 'Plato principal', price: 120, popular: true }],
      },
      {
        name: 'Bebidas',
        items: [{ name: 'Bebida', price: 30 }],
      },
    ],
  },
];

export function businessTypeById(id: string) {
  return businessTypes.find((type) => type.id === id);
}

/** Un producto del borrador; `source` solo vive en memoria para no pisar lo propio. */
export interface BuilderItem {
  id: string;
  name: string;
  price: string;
  description: string;
  category: string;
  popular: boolean;
  stock: number | null;
  isNew: boolean;
  image?: string;
  /** `bank` = vino del catálogo de arranque; `custom` = lo escribió el negocio. */
  source: 'bank' | 'custom';
}

export interface MenuPromo {
  enabled: boolean;
  text: string;
  price: string;
  note: string;
}

export const orderModeOptions = [
  { value: 'pickup', label: 'Para llevar', description: 'El cliente recoge en el local.' },
  { value: 'delivery', label: 'A domicilio', description: 'Con costo de envío opcional.' },
  { value: 'dinein', label: 'En el local', description: 'Piden desde su mesa con el QR.' },
] as const;

export type OrderMode = (typeof orderModeOptions)[number]['value'];

export const paymentMethodOptions = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Mercado Pago',
  'Pago contra entrega',
] as const;

export interface BuilderState {
  typeId: string;
  name: string;
  whatsapp: string;
  address: string;
  serviceDays: number[];
  openingTime: string;
  closingTime: string;
  logo: string;
  banner: string;
  categories: string[];
  items: BuilderItem[];
  promo: MenuPromo;
  orderModes: OrderMode[];
  deliveryFee: string;
  paymentMethods: string[];
  design: MenuDesign;
}

let idCounter = 0;
/** Id estable dentro del borrador (el demo también lo guarda como id del platillo). */
export function builderItemId(prefix = 'item') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function emptyBuilderState(design: MenuDesign = resolveMenuDesign()): BuilderState {
  return {
    typeId: '',
    name: '',
    whatsapp: '',
    address: '',
    serviceDays: [1, 2, 3, 4, 5, 6],
    openingTime: '13:00',
    closingTime: '22:00',
    logo: '',
    banner: '',
    categories: [],
    items: [],
    promo: { enabled: false, text: '', price: '', note: '' },
    orderModes: ['pickup'],
    deliveryFee: '',
    paymentMethods: ['Efectivo'],
    design,
  };
}

/** Productos y categorías de arranque de un giro, listos para el borrador. */
export function seedCatalog(typeId: string) {
  const type = businessTypeById(typeId);
  if (!type) return { categories: [] as string[], items: [] as BuilderItem[] };
  const categories = type.categories.map((category) => category.name);
  const items = type.categories.flatMap((category) =>
    category.items.map((item) => ({
      id: builderItemId(`bank-${typeId}`),
      name: item.name,
      price: String(item.price),
      description: item.description ?? '',
      category: category.name,
      popular: Boolean(item.popular),
      stock: item.stock ?? null,
      isNew: false,
      source: 'bank' as const,
    })),
  );
  return { categories, items };
}

/**
 * Cambia el giro conservando lo que el negocio escribió a mano: solo se
 * reemplazan los productos que venían del catálogo anterior.
 */
export function applyBusinessType(state: BuilderState, typeId: string) {
  const seeded = seedCatalog(typeId);
  const customItems = state.items.filter((item) => item.source === 'custom');
  const customCategories = state.categories.filter(
    (category) =>
      !state.items.some((item) => item.source === 'bank' && item.category === category) &&
      !seeded.categories.includes(category),
  );
  const categories = [...seeded.categories, ...customCategories];
  const items = [
    ...seeded.items,
    ...customItems.filter((item) => categories.includes(item.category)),
  ];
  return { ...state, typeId, categories, items };
}

export function openingHoursLabel(
  state: Pick<BuilderState, 'serviceDays' | 'openingTime' | 'closingTime'>,
) {
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const days = state.serviceDays.map((day) => names[day]).join(', ');
  if (!days || !state.openingTime || !state.closingTime) return 'Horario por definir';
  return `${days} · ${state.openingTime}–${state.closingTime}`;
}

export function builderPopularItems(state: BuilderState, limit = 6) {
  const popular = state.items.filter((item) => item.popular);
  return (popular.length ? popular : state.items).slice(0, limit);
}

export function builderCategories(state: BuilderState) {
  return state.categories.filter((category) =>
    state.items.some((item) => item.category === category),
  );
}

export function itemsOfCategory(state: BuilderState, category: string) {
  return state.items.filter((item) => item.category === category);
}

/** Mensaje de WhatsApp que recibe el negocio cuando el cliente pide desde el menú. */
export function builderWhatsAppLink(phone: string, businessName: string) {
  const digits = phone.replace(/\D/g, '');
  const text = encodeURIComponent(
    `Hola, ${businessName || 'quiero hacer un pedido'}. Vi su menú y quiero pedir.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

const text = (value: string | undefined) => value?.trim() ?? '';

/** Estado del creador a partir de la configuración actual del negocio. */
export function builderStateFromConfig(config: BusinessConfig): BuilderState {
  const typeId = businessTypes.find((type) => type.label === text(config.businessType))?.id ?? '';
  const promo = config.menuPromo;
  return {
    ...emptyBuilderState(
      resolveMenuDesign({
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        fontFamily: config.fontFamily,
        menuStyle: config.menuStyle,
        layout: config.menuLayout,
        logoShape: config.menuLogoShape,
        cardStyle: config.menuCardStyle,
        surface: config.menuSurface,
        navStyle: config.menuNavStyle,
      }),
    ),
    typeId,
    name: config.name ?? '',
    whatsapp: text(config.phoneNumbers?.[0] ?? config.phone),
    address: text(config.address ?? config.location),
    serviceDays: config.serviceDays?.length ? [...config.serviceDays] : [1, 2, 3, 4, 5, 6],
    openingTime: config.openingTime ?? '13:00',
    closingTime: config.closingTime ?? '22:00',
    logo: config.logo ?? '',
    banner: config.banner ?? '',
    categories: [...(config.categories ?? [])],
    items: (config.menuItems ?? []).map((item) => ({
      id: String(item.id),
      name: item.name,
      price: String(item.price ?? ''),
      description: text(item.description),
      category: text(item.category) || (config.categories?.[0] ?? ''),
      popular: Boolean(item.popular ?? item.isPopular),
      stock: typeof item.stock === 'number' ? item.stock : null,
      isNew: Boolean(item.isNew),
      image: item.image ?? item.imageUrl,
      source: 'custom' as const,
    })),
    promo: promo
      ? { enabled: true, text: text(promo.text), price: text(promo.price), note: text(promo.note) }
      : { enabled: false, text: '', price: '', note: '' },
    orderModes: config.orderModes?.length
      ? [...config.orderModes]
      : config.deliveryAvailable
        ? ['pickup', 'delivery']
        : ['pickup'],
    deliveryFee: text(config.deliveryFee),
    paymentMethods: config.paymentMethods?.length ? [...config.paymentMethods] : ['Efectivo'],
    design: resolveMenuDesign({
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      fontFamily: config.fontFamily,
      menuStyle: config.menuStyle,
      layout: config.menuLayout,
      logoShape: config.menuLogoShape,
      cardStyle: config.menuCardStyle,
      surface: config.menuSurface,
      navStyle: config.menuNavStyle,
    }),
  };
}

/** Configuración del negocio con todo lo que capturó el creador de menús. */
export function builderToConfig(current: BusinessConfig, state: BuilderState): BusinessConfig {
  const items: MenuItem[] = state.items
    .filter((item) => item.name.trim())
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      price: item.price.trim(),
      description: item.description.trim() || undefined,
      category: item.category,
      ...(item.image ? { image: item.image } : {}),
      popular: item.popular,
      available: item.stock === null ? true : item.stock > 0,
      ...(item.stock === null ? {} : { stock: item.stock }),
      ...(item.isNew ? { isNew: true } : {}),
    }));
  const categories = state.categories.filter((category) =>
    items.some((item) => item.category === category),
  );
  const type = businessTypeById(state.typeId);
  return {
    ...current,
    name: state.name.trim(),
    logo: state.logo || undefined,
    banner: state.banner || undefined,
    categories,
    menuItems: items,
    primaryColor: state.design.primaryColor,
    secondaryColor: state.design.secondaryColor,
    fontFamily: state.design.fontFamily,
    menuStyle: state.design.menuStyle,
    menuLayout: state.design.layout,
    menuLogoShape: state.design.logoShape,
    menuCardStyle: state.design.cardStyle,
    menuSurface: state.design.surface,
    menuNavStyle: state.design.navStyle,
    phone: state.whatsapp.trim() || undefined,
    phoneNumbers: state.whatsapp.trim() ? [state.whatsapp.trim()] : [],
    address: state.address.trim(),
    location: state.address.trim(),
    serviceDays: [...state.serviceDays].sort((a, b) => a - b),
    openingTime: state.openingTime,
    closingTime: state.closingTime,
    openingHours: openingHoursLabel(state),
    deliveryAvailable: state.orderModes.includes('delivery'),
    allowOrders: state.orderModes.length > 0,
    businessType: type?.label,
    orderModes: [...state.orderModes],
    paymentMethods: [...state.paymentMethods],
    deliveryFee: state.deliveryFee.trim() || undefined,
    menuPromo:
      state.promo.enabled && state.promo.text.trim()
        ? {
            text: state.promo.text.trim(),
            ...(state.promo.price.trim() ? { price: state.promo.price.trim() } : {}),
            ...(state.promo.note.trim() ? { note: state.promo.note.trim() } : {}),
          }
        : undefined,
    onboarded: current.onboarded ?? true,
  };
}

export type BuilderStep = 'categories' | 'products' | 'information' | 'design' | 'service';

export interface BuilderSave {
  step: BuilderStep;
  data: Record<string, unknown>;
}

/**
 * Payloads que se envían con `PUT /business/card` al publicar, en el mismo
 * contrato por pasos que ya usa el configurador del menú.
 */
export function builderSaves(config: BusinessConfig): BuilderSave[] {
  const design = resolveMenuDesign({
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    fontFamily: config.fontFamily,
    menuStyle: config.menuStyle,
    layout: config.menuLayout,
    logoShape: config.menuLogoShape,
    cardStyle: config.menuCardStyle,
    surface: config.menuSurface,
    navStyle: config.menuNavStyle,
  });
  return [
    {
      step: 'information',
      data: {
        name: config.name,
        description: config.description ?? '',
        welcome_message: config.welcomeMessage ?? '',
        logo_url: config.logo ?? null,
        background_url: config.banner ?? null,
        phone: config.phone ?? null,
        phone_numbers: config.phoneNumbers ?? [],
        address: config.address ?? '',
        business_type: config.businessType ?? null,
      },
    },
    { step: 'categories', data: { category_ids: config.categories } },
    {
      step: 'products',
      data: {
        products: config.menuItems.map((item, position) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? '',
          price: item.price ?? '',
          category_id: item.category ?? '',
          image_url: item.image ?? item.imageUrl ?? null,
          position,
          available: item.available ?? true,
          popular: item.popular ?? false,
          stock: item.stock ?? null,
          is_new: item.isNew ?? false,
        })),
      },
    },
    {
      step: 'design',
      data: {
        primary_color: design.primaryColor,
        secondary_color: design.secondaryColor,
        font_family: design.fontFamily,
        menu_style: design.menuStyle,
        menu_layout: design.layout,
        logo_shape: design.logoShape,
        card_style: design.cardStyle,
        surface: design.surface,
        nav_style: design.navStyle,
      },
    },
    {
      step: 'service',
      data: {
        service_days: config.serviceDays ?? [],
        opening_time: config.openingTime ?? '',
        closing_time: config.closingTime ?? '',
        opening_hours: config.openingHours ?? '',
        delivery_available: config.deliveryAvailable ?? false,
        allow_orders: config.allowOrders ?? true,
        order_modes: config.orderModes ?? [],
        payment_methods: config.paymentMethods ?? [],
        delivery_fee: config.deliveryFee ?? null,
        menu_promo: config.menuPromo ?? null,
      },
    },
  ];
}

/**
 * Errores por paso, en el mismo orden que la pantalla: giro → productos →
 * negocio → diseño → entrega. Vacío cuando se puede continuar.
 */
export function builderStepError(state: BuilderState, step: number): string {
  if (step === 0 && !state.typeId && !state.items.length)
    return 'Elige qué vendes para armar tu menú.';
  if (step === 1) {
    if (!state.items.length) return 'Agrega al menos un producto a tu menú.';
    if (state.items.some((item) => !item.name.trim() || !item.price.trim()))
      return 'Cada producto necesita nombre y precio.';
    if (!builderCategories(state).length) return 'Asigna tus productos a una categoría.';
  }
  if (step === 2) {
    if (state.name.trim().length < 2)
      return 'Escribe el nombre de tu negocio (mínimo 2 caracteres).';
    const digits = state.whatsapp.replace(/\D/g, '');
    if (state.whatsapp.trim() && (digits.length < 10 || digits.length > 15))
      return 'Revisa el WhatsApp: son entre 10 y 15 dígitos.';
    if (!state.serviceDays.length) return 'Selecciona al menos un día de servicio.';
    if (!state.openingTime || !state.closingTime || state.openingTime >= state.closingTime)
      return 'Revisa el horario: el cierre debe ser después de la apertura.';
  }
  if (step === 4) {
    if (!state.orderModes.length) return 'Elige al menos una forma de entrega.';
    if (state.promo.enabled && state.promo.text.trim().length < 5)
      return 'Escribe la promoción con al menos 5 caracteres.';
  }
  return '';
}
