import { z } from 'zod';
import { isDemo } from '../lib/utils';
import {
  activitySchema,
  adminBusinessInputSchema,
  adminBusinessReportSchema,
  adminBusinessSchema,
  adminCategoryInputSchema,
  adminCategorySchema,
  businessSchema,
  businessQRConfigurationSchema,
  cardSchema,
  foodBrandIcons,
  foodCategories,
  loyaltyCardThemes,
  menuFontFamilies,
  promotionSchema,
  publicMenuSchema,
  type AdminBusiness,
  type AdminBusinessInput,
  type AdminBusinessReport,
  type AdminCategoryInput,
  type BusinessConfig,
  type BusinessQRConfiguration,
  type Promotion,
} from '../lib/types';
import { baseURL, http } from './http';
import * as authService from './auth';
import {
  readAdminBusinesses,
  readAdminCategories,
  readDB,
  redeemDemo,
  updateAdminBusinesses,
  updateAdminCategories,
  updateDB,
} from './demo';
// Contrato de guardado por paso del asistente de configuración del menú.
/** Payload para crear una promoción: los campos de identidad los rellena el backend/demo. */
export type PromotionInput = {
  title: string;
  description: string;
  expires: string;
  image: string;
} & Partial<Promotion>;

export type PublicCategory = { id: string; name: string; icon?: string };
export type BusinessWizardStep = 'information' | 'categories' | 'products' | 'design' | 'service';
export type BusinessWizardStepSave = {
  step: BusinessWizardStep;
  data: Record<string, unknown>;
  /** Estado completo para mantener el almacenamiento demo y la caché del cliente sincronizados. */
  config: BusinessConfig;
};

function unwrapPublicMenu(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const value = payload as Record<string, unknown>;
  for (const key of ['data', 'business', 'menu']) {
    if (value[key] && typeof value[key] === 'object') return unwrapPublicMenu(value[key]);
  }
  return payload;
}

function unwrapAdminCategoryList(payload: unknown): unknown {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== 'object') return current;
    const value = current as Record<string, unknown>;
    if (Array.isArray(value.categories)) return value.categories;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    current = value.data ?? value.categories ?? value.items;
  }
  return current;
}

function unwrapAdminBusinessResponse(payload: unknown) {
  const containers: Record<string, unknown>[] = [];
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) return { businesses: current, containers };
    if (!current || typeof current !== 'object') break;
    const value = record(current);
    containers.push(value);
    for (const key of ['businesses', 'items', 'results', 'data']) {
      if (Array.isArray(value[key])) return { businesses: value[key] as unknown[], containers };
    }
    const nested = value.data ?? value.result ?? value.payload;
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) break;
    current = nested;
  }
  return { businesses: [], containers };
}

function firstDefined(source: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = source[name];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const adminBusinessStatuses = new Set(['pending', 'active', 'cancelled', 'onboarding']);
function normalizeAdminBusiness(payload: unknown, index: number): AdminBusiness {
  const value = record(payload);
  const membership = record(value.membership ?? value.subscription);
  const rawStatus = String(
    firstDefined(value, ['status', 'business_status', 'subscription_status']) ??
      firstDefined(membership, ['status']) ??
      'pending',
  ).toLowerCase();
  const expiry =
    firstDefined(value, [
      'membership_expires_at',
      'membershipExpiresAt',
      'expires_at',
      'subscription_expires_at',
    ]) ?? firstDefined(membership, ['expires_at', 'expiresAt', 'end_date']);
  const active =
    firstDefined(value, ['membership_active', 'membershipActive', 'is_membership_active']) ??
    firstDefined(membership, ['active', 'is_active']);
  const business: AdminBusiness = {
    id: String(value.id ?? value.business_id ?? `business-${index + 1}`),
    name: String(firstDefined(value, ['name', 'business_name', 'title']) ?? 'Negocio sin nombre'),
    slug: stringValue(firstDefined(value, ['slug', 'business_slug'])),
    email: stringValue(firstDefined(value, ['email', 'contact_email'])),
    phone: stringValue(firstDefined(value, ['phone', 'phone_number', 'contact_phone'])),
    status: adminBusinessStatuses.has(rawStatus)
      ? (rawStatus as AdminBusiness['status'])
      : 'pending',
    membershipActive: typeof active === 'boolean' ? active : undefined,
    membershipExpiresAt: stringValue(expiry),
    customerCount: numberValue(
      firstDefined(value, ['customer_count', 'customers_count', 'customerCount']),
    ),
    currentMonthCustomerCount: numberValue(
      firstDefined(value, [
        'current_month_customers',
        'customers_current_month',
        'currentMonthCustomers',
      ]),
    ),
    previousMonthCustomerCount: numberValue(
      firstDefined(value, ['previous_month_customer_count', 'customers_previous_month']),
    ),
    currentMonthRevenue: numberValue(
      firstDefined(value, ['current_month_revenue', 'revenue_current_month']),
    ),
    previousMonthRevenue: numberValue(
      firstDefined(value, ['previous_month_revenue', 'revenue_previous_month']),
    ),
    createdAt: stringValue(firstDefined(value, ['created_at', 'createdAt'])),
  };
  return adminBusinessSchema.parse(business);
}

function getAdminBusinessStatistics(containers: Record<string, unknown>[]) {
  const sources: Record<string, unknown>[] = [];
  for (const container of containers) {
    sources.push(container);
    for (const key of ['statistics', 'stats', 'summary', 'metrics']) {
      const nested = container[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested))
        sources.unshift(record(nested));
    }
  }
  const metric = (names: string[]) => {
    for (const source of sources) {
      const value = numberValue(firstDefined(source, names));
      if (value !== undefined) return value;
    }
    return undefined;
  };
  const statistics = {
    currentMonthCustomers: metric([
      'current_month_customers',
      'customers_current_month',
      'customer_count_current_month',
      'currentMonthCustomers',
    ]),
    previousMonthCustomers: metric([
      'previous_month_customers',
      'customers_previous_month',
      'customer_count_previous_month',
      'previousMonthCustomers',
    ]),
    currentMonthRevenue: metric([
      'current_month_revenue',
      'revenue_current_month',
      'earned_current_month',
      'currentMonthRevenue',
    ]),
    previousMonthRevenue: metric([
      'previous_month_revenue',
      'revenue_previous_month',
      'earned_previous_month',
      'previousMonthRevenue',
    ]),
    expiringMemberships: metric([
      'expiring_memberships',
      'memberships_expiring',
      'expiring_memberships_count',
      'expiringMemberships',
    ]),
  };
  return Object.values(statistics).some((value) => value !== undefined) ? statistics : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export class PublicMenuNotFoundError extends Error {
  constructor() {
    super('No encontramos un menú publicado para este enlace.');
    this.name = 'PublicMenuNotFoundError';
  }
}

function publicAssetUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const source = value.trim();
  const markdownLink = source.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  const asset = markdownLink?.[1] ?? source;
  try {
    const url = new URL(asset, baseURL);
    const apiUrl = new URL(baseURL);
    // URLs persisted by local/dev APIs must not point the customer's browser at its own localhost.
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      url.protocol = apiUrl.protocol;
      url.hostname = apiUrl.hostname;
      url.port = apiUrl.port;
    }
    return url.href;
  } catch {
    return asset;
  }
}

function publicProductImage(product: Record<string, unknown>): string | undefined {
  for (const candidate of [
    product.image_url,
    product.image,
    product.imageUrl,
    product.photo_url,
    product.photo,
  ]) {
    const image = publicAssetUrl(candidate);
    if (image) return image;
  }

  if (!Array.isArray(product.images)) return undefined;
  const images = product.images
    .map((image, index) => ({ image: record(image), index }))
    .sort((a, b) => {
      const position = (item: Record<string, unknown>, fallback: number) => {
        const value = Number(item.sort_order ?? fallback);
        return Number.isFinite(value) ? value : fallback;
      };
      return position(a.image, a.index) - position(b.image, b.index);
    });

  for (const { image } of images) {
    const url = publicAssetUrl(
      image.url ?? image.image_url ?? image.image ?? image.path ?? image.src,
    );
    if (url) return url;
  }
  return undefined;
}

function parsePhoneValues(value: unknown): string[] {
  if (Array.isArray(value))
    return value.flatMap((item) =>
      typeof item === 'string' || typeof item === 'number' ? [String(item).trim()] : [],
    );
  if (typeof value !== 'string') return [];
  const phone = value.trim();
  if (!phone) return [];
  if (phone.startsWith('[') || phone.startsWith('{')) {
    try {
      return parsePhoneValues(JSON.parse(phone));
    } catch {
      return [];
    }
  }
  return [phone];
}

function normalizePublicBusinessMenu(payload: unknown) {
  const value = record(unwrapPublicMenu(payload));
  if (!Object.keys(value).length || typeof value.name !== 'string' || !value.name.trim())
    return null;
  if (value.is_active === false || value.isActive === false) return null;

  const menuDesign = record(value.menu_design ?? value.menuDesign);
  const cardSettings = record(value.card_settings ?? value.cardSettings);
  const rawCategories = Array.isArray(value.categories) ? value.categories : [];
  const categoryDetails = rawCategories
    .map((category, index) => {
      if (typeof category === 'string') return { id: category, name: category, order: index };
      const item = record(category);
      const name = [item.name, item.title, item.label].find(
        (candidate): candidate is string =>
          typeof candidate === 'string' && Boolean(candidate.trim()),
      );
      if (!name) return null;
      const id = String(item.category_id ?? item.id ?? item.slug ?? name);
      const rawOrder = Number(item.sort_order ?? item.position ?? index);
      return {
        id,
        name,
        icon: publicAssetUrl(item.icon ?? item.icon_url ?? item.image_url),
        order: Number.isFinite(rawOrder) ? rawOrder : index,
      };
    })
    .filter((category): category is NonNullable<typeof category> => Boolean(category))
    .sort((a, b) => a.order - b.order);
  const categoryNameById = new Map(categoryDetails.map((category) => [category.id, category.name]));
  const rawProducts = Array.isArray(value.products)
    ? value.products
    : Array.isArray(value.menu_items)
      ? value.menu_items
      : Array.isArray(value.menuItems)
        ? value.menuItems
        : Array.isArray(value.items)
          ? value.items
          : [];
  const menuItems = rawProducts
    .map((product, index) => ({ product: record(product), index }))
    .sort((a, b) => {
      const order = (item: Record<string, unknown>, fallback: number) => {
        const position = Number(item.sort_order ?? item.position ?? fallback);
        return Number.isFinite(position) ? position : fallback;
      };
      return order(a.product, a.index) - order(b.product, b.index);
    })
    .map(({ product: item, index }) => {
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      const categoryRecord = record(item.category);
      const rawCategory =
        typeof item.category === 'string' || typeof item.category === 'number'
          ? String(item.category)
          : undefined;
      const categoryId = String(
        item.category_id ?? categoryRecord.category_id ?? categoryRecord.id ?? rawCategory ?? '',
      );
      const category =
        (rawCategory && categoryNameById.get(rawCategory)) ||
        (typeof categoryRecord.name === 'string' ? categoryRecord.name : undefined) ||
        (typeof item.category_name === 'string' ? item.category_name : undefined) ||
        categoryNameById.get(categoryId) ||
        (rawCategory && !/^\d+$/.test(rawCategory) ? rawCategory : undefined);
      const image = publicProductImage(item);
      const available = [item.available, item.is_available, item.is_active].find(
        (candidate): candidate is boolean => typeof candidate === 'boolean',
      );
      const orderCount = Number(item.order_count ?? item.orders_count ?? item.orderCount ?? 0);
      return {
        id: String(item.id ?? item.product_id ?? `product-${index + 1}`),
        name,
        description: typeof item.description === 'string' ? item.description : undefined,
        price:
          typeof item.price === 'string' || typeof item.price === 'number' ? item.price : undefined,
        category,
        image,
        available,
        popular: typeof item.popular === 'boolean' ? item.popular : undefined,
        isPopular:
          typeof item.is_popular === 'boolean'
            ? item.is_popular
            : typeof item.isPopular === 'boolean'
              ? item.isPopular
              : undefined,
        orderCount: Number.isFinite(orderCount) ? orderCount : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const phoneNumbers = [
    ...new Set(
      [
        ...parsePhoneValues(value.phone_numbers ?? value.phoneNumbers),
        ...parsePhoneValues(value.phone),
      ].filter(Boolean),
    ),
  ];
  const addressParts = [value.address, value.city, value.country].filter(
    (part): part is string => typeof part === 'string' && Boolean(part.trim()),
  );
  const address = addressParts.join(', ');
  const primaryColor =
    menuDesign.primary_color ??
    menuDesign.primaryColor ??
    cardSettings.primary_color ??
    value.primaryColor;
  const secondaryColor =
    menuDesign.secondary_color ??
    menuDesign.secondaryColor ??
    cardSettings.secondary_color ??
    value.secondaryColor;
  const logo = publicAssetUrl(value.logo_url ?? value.logo);
  const banner = publicAssetUrl(value.background_url ?? value.banner);
  const phone = phoneNumbers[0];
  const openingTime = value.opening_time ?? value.openingTime;
  const closingTime = value.closing_time ?? value.closingTime;
  const serviceDays = value.service_days ?? value.serviceDays;
  const rawWelcomeMessage =
    cardSettings.welcome_message ??
    cardSettings.welcomeMessage ??
    value.welcome_message ??
    value.welcomeMessage;
  const fontFamily = menuDesign.font_family ?? menuDesign.fontFamily ?? value.fontFamily;
  const menuStyle = menuDesign.menu_style ?? menuDesign.menuStyle ?? value.menuStyle;
  const openingHours =
    value.opening_hours ??
    value.openingHours ??
    (typeof openingTime === 'string' && typeof closingTime === 'string'
      ? `${openingTime}–${closingTime}`
      : undefined);

  return {
    id: typeof value.id === 'string' || typeof value.id === 'number' ? value.id : undefined,
    slug: typeof value.slug === 'string' ? value.slug : undefined,
    name: value.name,
    description: typeof value.description === 'string' ? value.description : undefined,
    logo,
    banner,
    categories: categoryDetails.map((category) => category.name),
    categoryDetails: categoryDetails.map(({ id, name, icon }) => ({ id, name, icon })),
    menuItems,
    primaryColor: typeof primaryColor === 'string' ? primaryColor : undefined,
    secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : undefined,
    address: address || undefined,
    location:
      [value.city, value.country]
        .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
        .join(', ') || undefined,
    phone,
    phoneNumbers,
    welcomeMessage: typeof rawWelcomeMessage === 'string' ? rawWelcomeMessage : undefined,
    serviceDays: Array.isArray(serviceDays)
      ? serviceDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : undefined,
    openingTime: typeof openingTime === 'string' ? openingTime : undefined,
    closingTime: typeof closingTime === 'string' ? closingTime : undefined,
    deliveryAvailable:
      typeof (value.delivery_available ?? value.deliveryAvailable) === 'boolean'
        ? (value.delivery_available ?? value.deliveryAvailable)
        : undefined,
    allowOrders:
      typeof (value.allow_orders ?? value.allowOrders) === 'boolean'
        ? (value.allow_orders ?? value.allowOrders)
        : undefined,
    fontFamily:
      typeof fontFamily === 'string' &&
      menuFontFamilies.includes(fontFamily as (typeof menuFontFamilies)[number])
        ? (fontFamily as (typeof menuFontFamilies)[number])
        : undefined,
    menuStyle: menuStyle === 'compact' || menuStyle === 'cozy' ? menuStyle : undefined,
    openingHours: typeof openingHours === 'string' ? openingHours : undefined,
  };
}

function unwrapBusinessConfig(payload: unknown): Record<string, unknown> {
  let current = record(payload);
  for (let depth = 0; depth < 4; depth += 1) {
    const nested = record(current.data);
    if (Object.keys(nested).length) {
      current = nested;
      continue;
    }
    const business = record(current.business);
    if (Object.keys(business).length) {
      current = business;
      continue;
    }
    break;
  }
  return current;
}

function normalizePublicCategories(payload: unknown): PublicCategory[] {
  let current = payload;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(current)) {
      return current
        .map((category, index) => {
          if (typeof category === 'string') return { id: category, name: category };
          const value = record(category);
          const name = [value.name, value.title, value.label].find(
            (candidate): candidate is string =>
              typeof candidate === 'string' && Boolean(candidate.trim()),
          );
          const icon = [value.icon, value.icon_url, value.image_url].find(
            (candidate): candidate is string =>
              typeof candidate === 'string' && Boolean(candidate.trim()),
          );
          return name
            ? {
                id: String(value.id ?? value.slug ?? name ?? index),
                name,
                ...(icon ? { icon } : {}),
              }
            : null;
        })
        .filter((category): category is PublicCategory => Boolean(category));
    }
    const value = record(current);
    if (Array.isArray(value.categories)) {
      current = value.categories;
      continue;
    }
    if (Array.isArray(value.items)) {
      current = value.items;
      continue;
    }
    if (value.data !== undefined) {
      current = value.data;
      continue;
    }
    break;
  }
  return [];
}

function normalizeBusinessConfig(payload: unknown) {
  const value = unwrapBusinessConfig(payload);
  const cardSettings = record(value.card_settings ?? value.cardSettings);
  const menuDesign = record(value.menu_design ?? value.menuDesign);
  const rawFontFamily =
    menuDesign.font_family ?? menuDesign.fontFamily ?? cardSettings.font_family ?? value.fontFamily;
  const name = typeof value.name === 'string' ? value.name : '';
  const rawCategories = Array.isArray(value.categories) ? value.categories : [];
  const categoryDetails = rawCategories
    .map((category) => {
      if (typeof category === 'string') return { id: category, name: category };
      const categoryRecord = record(category);
      const name = typeof categoryRecord.name === 'string' ? categoryRecord.name.trim() : '';
      if (!name) return null;
      return {
        id: String(categoryRecord.category_id ?? categoryRecord.id ?? categoryRecord.slug ?? name),
        name,
      };
    })
    .filter((category): category is NonNullable<typeof category> => Boolean(category));
  const categories = categoryDetails.map((category) => category.name);
  const categoryNameById = new Map(categoryDetails.map((category) => [category.id, category.name]));
  const rawProducts = Array.isArray(value.products)
    ? value.products
    : Array.isArray(value.menu_items)
      ? value.menu_items
      : Array.isArray(value.menuItems)
        ? value.menuItems
        : [];
  const menuItems = rawProducts
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const order = (product: unknown, fallback: number) => {
        const item = record(product);
        const position = Number(item.sort_order ?? item.position ?? fallback);
        return Number.isFinite(position) ? position : fallback;
      };
      return order(a.product, a.index) - order(b.product, b.index);
    })
    .map(({ product, index }) => {
      const item = record(product);
      const productCategory = record(item.category);
      const itemName = typeof item.name === 'string' ? item.name : '';
      if (!itemName.trim()) return null;
      const price =
        typeof item.price === 'string' || typeof item.price === 'number' ? item.price : undefined;
      const categoryValue =
        typeof item.category === 'string' || typeof item.category === 'number'
          ? String(item.category)
          : undefined;
      const categoryId = String(
        item.category_id ??
          item.menu_category_id ??
          productCategory.category_id ??
          productCategory.id ??
          categoryValue ??
          '',
      );
      const category =
        (categoryValue && categoryNameById.get(categoryValue)) ||
        (categoryValue && !/^\d+$/.test(categoryValue) ? categoryValue : undefined) ||
        (typeof productCategory.name === 'string' ? productCategory.name : undefined) ||
        (typeof item.category_name === 'string' ? item.category_name : undefined) ||
        categoryNameById.get(categoryId);
      const image = publicProductImage(item);
      return {
        id: String(item.id ?? `product-${index + 1}`),
        name: itemName,
        description: typeof item.description === 'string' ? item.description : undefined,
        price,
        category,
        image,
        available:
          typeof item.available === 'boolean'
            ? item.available
            : typeof item.is_available === 'boolean'
              ? item.is_available
              : typeof item.is_active === 'boolean'
                ? item.is_active
                : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const rawGoal = Number(cardSettings.required_stamps ?? value.goal ?? 8);
  const goal = Number.isFinite(rawGoal) ? Math.min(12, Math.max(2, Math.round(rawGoal))) : 8;
  const rawIcon = cardSettings.stamp_icon ?? cardSettings.icon ?? value.icon;
  const icon =
    typeof rawIcon === 'string' &&
    foodBrandIcons.includes(rawIcon as (typeof foodBrandIcons)[number])
      ? (rawIcon as (typeof foodBrandIcons)[number])
      : 'coffee';
  const rawTheme = cardSettings.theme ?? cardSettings.card_theme ?? value.theme;
  const validTheme =
    typeof rawTheme === 'string' &&
    loyaltyCardThemes.includes(rawTheme as (typeof loyaltyCardThemes)[number])
      ? (rawTheme as (typeof loyaltyCardThemes)[number])
      : 'forest';
  const phone = typeof value.phone === 'string' ? value.phone : undefined;
  const addressParts = [value.address, value.city, value.country].filter(
    (part): part is string => typeof part === 'string' && Boolean(part.trim()),
  );
  const address = addressParts.join(', ');
  const logo = publicAssetUrl(value.logo_url ?? value.logo);
  const banner = publicAssetUrl(value.background_url ?? value.banner);
  const primaryColor = cardSettings.primary_color ?? value.primaryColor;
  const secondaryColor = cardSettings.secondary_color ?? value.secondaryColor;
  const qrSettings = record(value.qr_settings ?? value.qrSettings);
  const qrForeground =
    qrSettings.foreground ??
    cardSettings.qr_foreground ??
    value.qr_foreground ??
    value.qrForeground;
  const qrBackground =
    qrSettings.background ??
    cardSettings.qr_background ??
    value.qr_background ??
    value.qrBackground;
  const qrEyeColor = qrSettings.eye_color ?? value.qr_eye_color ?? value.qrEyeColor;
  const qrContent = qrSettings.content ?? value.qr_content ?? value.qrContent;
  const qrLogo = qrSettings.logo ?? value.qr_logo ?? value.qrLogo;
  const qrBodyStyle = qrSettings.body_style ?? value.qr_body_style ?? value.qrBodyStyle;
  const qrEyeFrameStyle =
    qrSettings.eye_frame_style ?? value.qr_eye_frame_style ?? value.qrEyeFrameStyle;
  const qrEyeStyle = qrSettings.eye_style ?? value.qr_eye_style ?? value.qrEyeStyle;
  const rawQrSize = Number(qrSettings.size ?? value.qr_size ?? value.qrSize);
  const qrSize =
    Number.isInteger(rawQrSize) && rawQrSize >= 256 && rawQrSize <= 2048 ? rawQrSize : undefined;
  const qrBodyStyles = ['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'classy-rounded'];
  const qrEyeStyles = [
    'square',
    'dot',
    'dots',
    'rounded',
    'extra-rounded',
    'classy',
    'classy-rounded',
  ];
  const requiredString = (candidate: unknown) =>
    typeof candidate === 'string' && candidate.length ? candidate : undefined;
  const inferredOnboarded = Boolean(name.trim() && logo && categories.length);

  return {
    name,
    reward: requiredString(value.reward) ?? 'Recompensa por fidelidad',
    goal,
    theme: validTheme,
    icon,
    logo: typeof logo === 'string' ? logo : undefined,
    banner: typeof banner === 'string' ? banner : undefined,
    categories,
    menuImage: requiredString(value.menuImage),
    menuItems,
    primaryColor: typeof primaryColor === 'string' ? primaryColor : undefined,
    secondaryColor: typeof secondaryColor === 'string' ? secondaryColor : undefined,
    qrForeground: typeof qrForeground === 'string' ? qrForeground : undefined,
    qrBackground: typeof qrBackground === 'string' ? qrBackground : undefined,
    qrEyeColor: typeof qrEyeColor === 'string' ? qrEyeColor : undefined,
    qrContent: typeof qrContent === 'string' ? qrContent : undefined,
    qrLogo: publicAssetUrl(qrLogo),
    qrBodyStyle:
      typeof qrBodyStyle === 'string' && qrBodyStyles.includes(qrBodyStyle)
        ? qrBodyStyle
        : undefined,
    qrEyeFrameStyle:
      typeof qrEyeFrameStyle === 'string' && qrEyeStyles.includes(qrEyeFrameStyle)
        ? qrEyeFrameStyle
        : undefined,
    qrEyeStyle:
      typeof qrEyeStyle === 'string' && qrEyeStyles.includes(qrEyeStyle) ? qrEyeStyle : undefined,
    qrSize,
    welcomeMessage:
      requiredString(cardSettings.welcome_message) ?? requiredString(value.welcomeMessage),
    description: requiredString(value.description),
    phone,
    phoneNumbers: phone ? [phone] : [],
    address: address || undefined,
    location:
      [value.city, value.country]
        .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
        .join(', ') || undefined,
    openingHours: requiredString(value.openingHours),
    deliveryAvailable:
      typeof value.deliveryAvailable === 'boolean' ? value.deliveryAvailable : false,
    allowOrders: typeof value.allowOrders === 'boolean' ? value.allowOrders : true,
    fontFamily:
      typeof rawFontFamily === 'string' &&
      menuFontFamilies.includes(rawFontFamily as (typeof menuFontFamilies)[number])
        ? (rawFontFamily as (typeof menuFontFamilies)[number])
        : undefined,
    menuStyle: value.menuStyle,
    onboarded: typeof value.onboarded === 'boolean' ? value.onboarded : inferredOnboarded,
  };
}

function slugifyBusiness(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const api = {
  cards: async () =>
    isDemo ? readDB().cards : z.array(cardSchema).parse((await http.get('/customer/cards')).data),
  promotions: async () =>
    isDemo
      ? readDB().promotions
      : z.array(promotionSchema).parse((await http.get('/customer/promotions')).data),
  activity: async () =>
    isDemo
      ? readDB().activity
      : z.array(activitySchema).parse((await http.get('/customer/me/activity')).data),
  favorites: async () =>
    isDemo
      ? readDB().favorites
      : z.array(z.string()).parse((await http.get('/customer/me/favorites')).data),
  publicBusinessMenu: async (slug: string) => {
    if (isDemo) {
      const business = readDB().business;
      if (slug !== slugifyBusiness(business.name) && slug !== 'demo')
        throw new PublicMenuNotFoundError();
      return publicMenuSchema.parse(business);
    }
    try {
      const { data } = await http.get(`public/business/${encodeURIComponent(slug)}`);
      const normalized = normalizePublicBusinessMenu(data);
      if (
        !normalized ||
        (typeof normalized.slug === 'string' &&
          normalized.slug.toLocaleLowerCase() !== slug.toLocaleLowerCase())
      )
        throw new PublicMenuNotFoundError();
      return publicMenuSchema.parse(normalized);
    } catch (error) {
      if ((error as { status?: number })?.status === 404) throw new PublicMenuNotFoundError();
      throw error;
    }
  },
  publicCategories: async () => {
    if (isDemo) return foodCategories.map((name) => ({ id: name, name }));
    const { data } = await http.get('/public/categories');
    return normalizePublicCategories(data);
  },
  adminCategories: async () => {
    if (isDemo) return readAdminCategories();
    const { data } = await http.get('/admin/categories');
    return z.array(adminCategorySchema).parse(unwrapAdminCategoryList(data));
  },
  createAdminCategory: async (input: AdminCategoryInput) => {
    const category = adminCategoryInputSchema.parse(input);
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const created = { ...category, id: crypto.randomUUID() };
        categories.push(created);
        return created;
      });
    }
    return http.post('/admin/categories', category);
  },
  updateAdminCategory: async (id: string, input: AdminCategoryInput) => {
    const category = adminCategoryInputSchema.parse(input);
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const index = categories.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos esta categoría.');
        categories[index] = { ...category, id };
        return categories[index];
      });
    }
    return http.put(`/admin/categories/${encodeURIComponent(id)}`, category);
  },
  deleteAdminCategory: async (id: string) => {
    if (isDemo) {
      return updateAdminCategories((categories) => {
        const index = categories.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos esta categoría.');
        categories.splice(index, 1);
      });
    }
    return http.delete(`/admin/categories/${encodeURIComponent(id)}`);
  },
  adminBusinesses: async (): Promise<AdminBusinessReport> => {
    if (isDemo) {
      const businesses = readAdminBusinesses();
      const expiringMemberships = businesses.filter((business) => {
        if (!business.membershipActive || !business.membershipExpiresAt) return false;
        const days = (new Date(business.membershipExpiresAt).getTime() - Date.now()) / 86400000;
        return days >= 0 && days <= 30;
      }).length;
      return adminBusinessReportSchema.parse({
        businesses,
        statistics: {
          currentMonthCustomers: businesses.reduce(
            (sum, business) => sum + (business.currentMonthCustomerCount ?? 0),
            0,
          ),
          previousMonthCustomers: businesses.reduce(
            (sum, business) => sum + (business.previousMonthCustomerCount ?? 0),
            0,
          ),
          currentMonthRevenue: businesses.reduce(
            (sum, business) => sum + (business.currentMonthRevenue ?? 0),
            0,
          ),
          previousMonthRevenue: businesses.reduce(
            (sum, business) => sum + (business.previousMonthRevenue ?? 0),
            0,
          ),
          expiringMemberships,
        },
      });
    }
    const { data } = await http.get('/api/admin/business');
    const response = unwrapAdminBusinessResponse(data);
    return adminBusinessReportSchema.parse({
      businesses: response.businesses.map(normalizeAdminBusiness),
      statistics: getAdminBusinessStatistics(response.containers),
    });
  },
  createAdminBusiness: async (input: AdminBusinessInput) => {
    const business = adminBusinessInputSchema.parse(input);
    const payload = {
      ...business,
      email: business.email || undefined,
      membership_expires_at: business.membershipExpiresAt || undefined,
    };
    delete (payload as Partial<typeof payload>).membershipExpiresAt;
    if (isDemo) {
      return updateAdminBusinesses((businesses) => {
        const created: AdminBusiness = {
          ...business,
          email: business.email || undefined,
          membershipActive: business.status === 'active',
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        businesses.unshift(created);
        return created;
      });
    }
    return http.post('/api/admin/business', payload);
  },
  updateAdminBusiness: async (id: string, input: AdminBusinessInput) => {
    const business = adminBusinessInputSchema.parse(input);
    const payload = {
      ...business,
      email: business.email || undefined,
      membership_expires_at: business.membershipExpiresAt || undefined,
    };
    delete (payload as Partial<typeof payload>).membershipExpiresAt;
    if (isDemo) {
      return updateAdminBusinesses((businesses) => {
        const index = businesses.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos este negocio.');
        businesses[index] = {
          ...businesses[index],
          ...business,
          email: business.email || undefined,
          membershipActive: business.status === 'active',
        };
        return businesses[index];
      });
    }
    return http.put(`/api/admin/business/${encodeURIComponent(id)}`, payload);
  },
  deleteAdminBusiness: async (id: string) => {
    if (isDemo) {
      return updateAdminBusinesses((businesses) => {
        const index = businesses.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('No encontramos este negocio.');
        businesses.splice(index, 1);
      });
    }
    return http.delete(`/api/admin/business/${encodeURIComponent(id)}`);
  },
  toggleFavorite: async (id: string) =>
    isDemo
      ? updateDB((db) => {
          db.favorites = db.favorites.includes(id)
            ? db.favorites.filter((f) => f !== id)
            : [...db.favorites, id];
        })
      : http.post(`/customer/me/favorites/${encodeURIComponent(id)}/toggle`),
  join: async (id: string) => {
    if (!isDemo) return http.post(`/customer/cards/${encodeURIComponent(id)}/join`);
    return updateDB((db) => {
      const card = db.cards.find((c) => c.id === id);
      if (!card) throw new Error('No se encontró el negocio.');
      if (card.joined) return;
      card.joined = true;
      db.activity.unshift({
        id: crypto.randomUUID(),
        business: card.name,
        title: 'Te uniste a su comunidad',
        date: new Date().toISOString(),
        type: 'join',
        amount: 0,
      });
    });
  },
  redeem: async (id: string) =>
    isDemo
      ? redeemDemo(id)
      : http.post(
          `/customer/cards/${encodeURIComponent(id)}/redeem`,
          {},
          { headers: { 'Idempotency-Key': crypto.randomUUID() } },
        ),
  qr: async () =>
    isDemo
      ? { token: 'punto-plus:demo:sofia', expiresAt: null }
      : z
          .object({ token: z.string(), expiresAt: z.string().datetime() })
          .parse((await http.post('/customer/me/qr')).data),
  businessPromotions: async () =>
    z.array(promotionSchema).parse((await http.get('/business/promotions')).data),
  business: async () => {
    if (isDemo) return readDB().business;
    const { data } = await http.get('business/card');
    return businessSchema.parse(normalizeBusinessConfig(data));
  },
  saveBusiness: async (input: BusinessConfig) => {
    const config = businessSchema.parse(input);
    if (!isDemo) return http.put('/business/card', config);
    return updateDB((db) => {
      db.business = config;
      const card = db.cards.find((c) => c.id === 'cafe');
      if (card) Object.assign(card, { ...config, stamps: Math.min(card.stamps, config.goal) });
    });
  },
  saveBusinessQRConfiguration: async (input: BusinessQRConfiguration) => {
    const settings = businessQRConfigurationSchema.parse(input);
    const payload = {
      qr_content: settings.content,
      qr_foreground: settings.foreground,
      qr_background: settings.background,
      qr_eye_color: settings.eyeColor,
      qr_logo: settings.logo ?? null,
      qr_body_style: settings.bodyStyle,
      qr_eye_frame_style: settings.eyeFrameStyle,
      qr_eye_style: settings.eyeStyle,
      qr_size: settings.size,
    };
    if (!isDemo) return http.put('/business/configurations/qr-code', payload);
    return updateDB((db) => {
      db.business = {
        ...db.business,
        qrContent: settings.content,
        qrForeground: settings.foreground,
        qrBackground: settings.background,
        qrEyeColor: settings.eyeColor,
        qrLogo: settings.logo,
        qrBodyStyle: settings.bodyStyle,
        qrEyeFrameStyle: settings.eyeFrameStyle,
        qrEyeStyle: settings.eyeStyle,
        qrSize: settings.size,
      };
    });
  },
  saveBusinessStep: async ({ step, data, config }: BusinessWizardStepSave) => {
    if (!isDemo) return http.patch('/business/card', { step, data });
    const validated = businessSchema.parse(config);
    return updateDB((db) => {
      db.business = validated;
      const card = db.cards.find((c) => c.id === 'cafe');
      if (card)
        Object.assign(card, { ...validated, stamps: Math.min(card.stamps, validated.goal) });
    });
  },
  addPromotion: async (input: PromotionInput) => {
    if (!isDemo) return http.post('/business/promotions', input);
    return updateDB((db) => {
      db.promotions.unshift({
        ...input,
        id: crypto.randomUUID(),
        businessId: 'b1',
        business: db.business.name,
        category:
          (input.category as string | undefined) ?? db.business.categories?.[0] ?? 'Cafetería',
        badge: 'Nuevo para ti',
      });
    });
  },

  stamp: async (token: string) => {
    if (!isDemo)
      return http.post(
        '/business/purchases',
        { token },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
    if (token !== 'punto-plus:demo:sofia')
      throw new Error('QR no válido. En demo utiliza el QR de Sofía.');
    return updateDB((db) => {
      const card = db.cards.find((c) => c.id === 'cafe')!;
      if (card.stamps >= card.goal)
        throw new Error('La tarjeta está completa. Primero canjea la recompensa.');
      card.stamps += 1;
      db.activity.unshift({
        id: crypto.randomUUID(),
        business: card.name,
        title: 'Una visita, un sello más',
        date: new Date().toISOString(),
        type: 'stamp',
        amount: 1,
      });
    });
  },
  // Autenticación con Laravel Passport (Bearer token + refresh token).
  login: authService.login,
  register: authService.register,
  restore: authService.restore,
  logout: authService.logout,
};
