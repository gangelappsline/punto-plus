import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LogoPunto from '../assets/images/logo_2.webp';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { fontStack as menuFontStack } from '../components/LoyaltyCard';
import {
  cardStyleClass,
  logoShapeClass,
  menuTheme,
  resolveMenuDesign,
  type MenuDesign,
  type MenuTheme,
} from '../lib/menuStyles';
import { AppSplash } from '../components/AppSplash';
import { useSessionStatus } from '../lib/session';
import { panelPathFor } from '../lib/utils';
import type { MenuItem } from '../lib/types';
import { api, PublicMenuNotFoundError } from '../services/api';
import { useAuth } from '../stores/auth';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function itemImage(item: MenuItem) {
  if (item.image || item.imageUrl) return item.image || item.imageUrl!;
  const category = item.category?.toLowerCase() ?? '';
  if (/pan|postre|reposter|pastel|dulce/.test(category)) return '/images/bakery.webp';
  if (/matcha|té|bebida/.test(category)) return '/images/matcha.webp';
  return '/images/coffee.webp';
}

function itemPrice(item: MenuItem) {
  if (item.price === undefined || item.price === '') return 'Consultar';
  const amount = Number(item.price.replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? currency.format(amount) : item.price;
}

function popularity(items: MenuItem[]) {
  const ranked = items
    .filter(
      (item) => item.popular || item.isPopular || (item.orderCount ?? item.ordersCount ?? 0) > 0,
    )
    .sort((a, b) => (b.orderCount ?? b.ordersCount ?? 0) - (a.orderCount ?? a.ordersCount ?? 0));
  return (ranked.length ? ranked : items).slice(0, 3);
}

/** Menú público de un restaurante: la ruta es /<business_slug> y no requiere sesión. */
export function MenuPage() {
  const { businessSlug, businessId } = useParams<{ businessSlug?: string; businessId?: string }>();
  const slug = businessSlug ?? businessId ?? '';
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const accessToken = useAuth((state) => state.accessToken);
  const sessionStatus = useSessionStatus();
  const isClient = user?.role === 'client' && Boolean(accessToken) && sessionStatus === 'ready';
  const isAuthenticated = Boolean(user && accessToken && sessionStatus === 'ready');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [order, setOrder] = useState<Record<string, number>>({});
  const business = useQuery({
    queryKey: ['public-menu', slug],
    queryFn: () => api.publicBusinessMenu(slug),
    enabled: Boolean(slug),
    retry: false,
  });

  const data = business.data;
  const allItems = useMemo(
    () => (data?.menuItems ?? []).filter((item) => item.name.trim() && item.available !== false),
    [data?.menuItems],
  );
  const categories = useMemo(() => {
    const fromBusiness = data?.categories?.filter(Boolean) ?? [];
    const fromItems = allItems
      .map((item) => item.category)
      .filter((value): value is string => Boolean(value));
    return [...new Set([...fromBusiness, ...fromItems])];
  }, [allItems, data?.categories]);
  const categoryDetailsByName = useMemo(
    () => new Map((data?.categoryDetails ?? []).map((item) => [item.name, item])),
    [data?.categoryDetails],
  );
  const popularItems = useMemo(() => popularity(allItems), [allItems]);
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-MX');
    return allItems.filter((item) => {
      const matchesCategory = category === 'Todos' || item.category === category;
      const matchesSearch =
        !normalizedSearch ||
        `${item.name} ${item.description ?? ''} ${item.category ?? ''}`
          .toLocaleLowerCase('es-MX')
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [allItems, category, search]);
  useEffect(() => {
    setOrder({});
    setCategory('Todos');
    setSearch('');
    setSelectedItem(null);
  }, [slug]);

  const orderCount = Object.values(order).reduce((sum, quantity) => sum + quantity, 0);
  const orderTotal = allItems.reduce((sum, item) => {
    const price = Number((item.price ?? '').replace(/[^\d.]/g, ''));
    return sum + (Number.isFinite(price) ? price * (order[item.id] ?? 0) : 0);
  }, 0);

  function addItem(item: MenuItem) {
    if (!isClient) return;
    setOrder((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
  }

  function changeQuantity(item: MenuItem, change: number) {
    setOrder((current) => {
      const next = { ...current };
      const quantity = (next[item.id] ?? 0) + change;
      if (quantity <= 0) delete next[item.id];
      else next[item.id] = quantity;
      return next;
    });
  }

  if (!slug)
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center text-slate-700">
        <span className="grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <Utensils size={24} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
          PUNTO PLUS · MENÚ DIGITAL
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Falta el enlace del menú
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Abre el enlace que te compartió el negocio para ver su menú digital.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </main>
    );

  if (business.isPending) return <AppSplash message="Preparamos algo rico para ti…" />;

  if (business.isError || !data) {
    const notFound = business.error instanceof PublicMenuNotFoundError;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center text-slate-700">
        <span
          className={`grid size-16 place-items-center rounded-2xl ${notFound ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
        >
          <Utensils size={24} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
          PUNTO PLUS · MENÚ DIGITAL
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {notFound ? 'No encontramos este menú' : 'No pudimos cargar el menú'}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          {notFound
            ? `No hay un negocio con el enlace “${slug}” o todavía no ha publicado su menú. Verifica el enlace e inténtalo de nuevo.`
            : 'Ocurrió un problema al cargar el menú. Inténtalo de nuevo en un momento.'}
        </p>
        {notFound ? (
          <Button asChild variant="outline">
            <Link to="/">Volver al inicio</Link>
          </Button>
        ) : (
          <Button variant="outline" onClick={() => void business.refetch()}>
            Volver a intentar
          </Button>
        )}
      </main>
    );
  }

  const design = resolveMenuDesign({
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    fontFamily: data.fontFamily,
    menuStyle: data.menuStyle,
    layout: data.menuLayout,
    logoShape: data.menuLogoShape,
    cardStyle: data.menuCardStyle,
    surface: data.menuSurface,
    navStyle: data.menuNavStyle,
  });
  const theme = menuTheme(design);
  const dark = design.surface === 'dark';
  const primary = design.primaryColor;
  const secondary = design.secondaryColor;
  const itemsInOrder = allItems.filter((item) => order[item.id]);
  const categoryTitle = category === 'Todos' ? 'Nuestro menú' : category;
  const metaRow = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      {(data.address || data.location) && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} /> {data.address || data.location}
        </span>
      )}
      {data.openingHours && (
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} /> {data.openingHours}
        </span>
      )}
      {(data.phoneNumbers?.length ? data.phoneNumbers : data.phone ? [data.phone] : []).map(
        (phone) => (
          <a
            href={`tel:${phone.replace(/[^+\d]/g, '')}`}
            key={phone}
            className="underline-offset-4 hover:underline"
          >
            {phone}
          </a>
        ),
      )}
      {data.deliveryAvailable && <span>Reparto a domicilio</span>}
    </div>
  );

  return (
    <div
      className="min-h-screen overflow-x-hidden font-sans"
      style={
        {
          fontFamily: menuFontStack(design.fontFamily),
          backgroundColor: theme.surface,
          color: theme.ink,
          '--restaurant-primary': primary,
          '--restaurant-soft': secondary,
        } as React.CSSProperties
      }
      data-menu-layout={design.layout}
      data-menu-surface={design.surface}
      data-menu-logo={design.logoShape}
      data-menu-cards={design.cardStyle}
    >
      <header
        className={`relative isolate overflow-hidden text-white ${
          design.layout === 'compact'
            ? 'min-h-[250px] md:min-h-[300px]'
            : design.layout === 'split'
              ? 'min-h-[330px] md:min-h-[370px]'
              : 'min-h-[390px] md:min-h-[455px]'
        }`}
        style={design.layout === 'split' ? { backgroundColor: primary } : undefined}
      >
        <div className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-5 sm:px-8">
          <Link
            to="/"
            className="grid size-11 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
            aria-label="Volver al inicio"
          >
            <ArrowLeft size={18} />
          </Link>
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-white drop-shadow">
            <Sparkles size={14} /> PUNTO PLUS
          </span>
          {isClient && data.allowOrders !== false ? (
            <button
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 text-white backdrop-blur-md transition hover:bg-white/20"
              onClick={() => setOrderOpen(true)}
              aria-label={`Ver orden, ${orderCount} artículos`}
            >
              <ShoppingBag size={18} />
              <span className="text-sm font-bold tabular-nums">{orderCount}</span>
            </button>
          ) : (
            <span className="size-11" aria-hidden="true" />
          )}
        </div>
        {design.layout === 'split' ? (
          <div className="grid min-h-[inherit] w-full sm:grid-cols-2">
            <div
              className="flex flex-col justify-center gap-3 px-5 pt-24 pb-12 sm:px-8"
              style={{ color: theme.onPrimary }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-16 shrink-0 place-items-center overflow-hidden border-[3px] shadow-lg ${logoShapeClass[design.logoShape]}`}
                  style={{ borderColor: theme.onPrimary, backgroundColor: '#ffffff' }}
                >
                  {data.logo ? (
                    <img
                      src={data.logo}
                      alt={`Logo de ${data.name}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Utensils size={26} style={{ color: primary }} />
                  )}
                </div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-75">
                  Menú del restaurante
                </p>
              </div>
              <h1 className="text-balance text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
                {data.name}
              </h1>
              {data.description && (
                <p className="max-w-md text-pretty text-sm leading-6 opacity-85">
                  {data.description}
                </p>
              )}
              <div className="opacity-85">{metaRow}</div>
            </div>
            <div className="relative min-h-[170px]">
              {data.banner ? (
                <img src={data.banner} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: theme.hero }} />
              )}
            </div>
          </div>
        ) : (
          <>
            {data.banner ? (
              <img
                src={data.banner}
                alt=""
                className="absolute inset-0 size-full object-cover"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0" style={{ background: theme.hero }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-900/55 to-slate-950/90" />
            <div
              className={`relative z-10 mx-auto flex w-full max-w-4xl flex-col px-5 pb-16 text-white ${
                design.layout === 'poster'
                  ? 'items-start pt-24 text-left'
                  : 'items-center justify-center pt-20 text-center'
              } ${design.layout === 'compact' ? 'pt-20' : 'min-h-[330px] md:min-h-[390px]'}`}
            >
              {design.layout === 'compact' ? (
                <div className="flex w-full items-center gap-3">
                  <div
                    className={`grid size-14 shrink-0 place-items-center overflow-hidden border-[3px] bg-white shadow-xl ${logoShapeClass[design.logoShape]}`}
                    style={{ borderColor: dark ? theme.onPrimary : secondary }}
                  >
                    {data.logo ? (
                      <img
                        src={data.logo}
                        alt={`Logo de ${data.name}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Utensils size={22} style={{ color: primary }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-balance text-2xl leading-tight font-extrabold tracking-tight text-white drop-shadow sm:text-3xl">
                      {data.name}
                    </h1>
                    {data.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/85">
                        {data.description}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`grid size-20 place-items-center overflow-hidden border-[3px] bg-white shadow-2xl sm:size-24 ${logoShapeClass[design.logoShape]}`}
                    style={{ borderColor: dark ? theme.onPrimary : secondary }}
                  >
                    {data.logo ? (
                      <img
                        src={data.logo}
                        alt={`Logo de ${data.name}`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Utensils size={30} style={{ color: primary }} />
                    )}
                  </div>
                  <p className=" !hidden mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
                    MENÚ DEL RESTAURANTE
                  </p>
                  <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-5xl md:text-6xl">
                    {data.name}
                  </h1>
                  {data.description && (
                    <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-white/85 sm:text-base">
                      {data.description}
                    </p>
                  )}
                </>
              )}
              <div
                className={`mt-5 max-w-3xl text-white/85 ${
                  design.layout === 'poster' ? '' : 'flex justify-center'
                }`}
              >
                {metaRow}
              </div>
            </div>
          </>
        )}
        <div
          className={`absolute inset-x-[-5%] bottom-[-43px] h-[75px] rounded-t-[50%] ${dark ? 'hidden' : ''}`}
          style={{ backgroundColor: theme.surface }}
        />
      </header>

      <main
        className={`relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 ${dark ? 'mt-0 pt-8' : '-mt-7'}`}
      >
        <section
          className={`mb-7 flex items-center justify-between gap-5 p-5 sm:p-7 ${cardStyleClass[design.cardStyle]}`}
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <div className="w-full text-center">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--restaurant-primary)]">
              HECHO PARA DISFRUTAR
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              ¿Qué se te antoja?
            </h2>
            <p className="!hidden mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.muted }}>
              {data.welcomeMessage || 'Explora nuestros favoritos o encuentra algo nuevo.'}
            </p>
          </div>
          <div
            className="hidden size-14 shrink-0 place-items-center sm:grid"
            style={{
              borderRadius: design.logoShape === 'circle' ? '9999px' : undefined,
              backgroundColor: secondary,
              color: primary,
            }}
          >
            <Utensils size={23} />
          </div>
        </section>
        {data.allowOrders === false && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Este negocio no recibe pedidos desde el menú digital.
          </p>
        )}

        <div
          role="search"
          className="!hidden sticky top-0 z-20 mb-4 flex h-13 items-center gap-3 rounded-2xl border px-4 shadow-sm backdrop-blur-md focus-within:border-[var(--restaurant-primary)] focus-within:ring-4 focus-within:ring-[var(--restaurant-primary)]/10"
          style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.muted }}
        >
          <Search size={19} className="shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en el menú"
            aria-label="Buscar platillos"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-100 text-lg text-slate-500 hover:bg-stone-200"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>

        <nav
          className="sticky top-0 z-20 -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          style={{ backgroundColor: theme.surfaceVeil }}
          aria-label="Categorías del menú"
        >
          {['Todos', ...categories].map((item) => {
            const icon = item === 'Todos' ? undefined : categoryDetailsByName.get(item)?.icon;
            const active = category === item;
            if (design.navStyle === 'tabs') {
              return (
                <button
                  type="button"
                  key={item}
                  className="inline-flex shrink-0 items-center gap-2 border-b-2 px-1 pb-2 text-xs font-bold transition"
                  style={{
                    borderColor: active ? primary : 'transparent',
                    color: active ? primary : theme.muted,
                  }}
                  aria-pressed={active}
                  onClick={() => setCategory(item)}
                >
                  {icon && <img src={icon} alt="" className="size-4 rounded-full object-cover" />}
                  {item}
                </button>
              );
            }
            if (design.navStyle === 'cards') {
              return (
                <button
                  type="button"
                  key={item}
                  className="flex shrink-0 flex-col items-center gap-1.5 text-[11px] font-bold transition"
                  style={{ color: active ? primary : theme.muted }}
                  aria-pressed={active}
                  onClick={() => setCategory(item)}
                >
                  <span
                    className="grid size-14 place-items-center overflow-hidden rounded-full border-2"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: active ? primary : theme.border,
                    }}
                  >
                    {icon ? (
                      <img src={icon} alt="" className="size-full object-cover" />
                    ) : (
                      <Utensils size={20} />
                    )}
                  </span>
                  {item}
                </button>
              );
            }
            return (
              <button
                type="button"
                key={item}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition"
                style={
                  active
                    ? { backgroundColor: primary, borderColor: primary, color: theme.onPrimary }
                    : { backgroundColor: theme.card, borderColor: theme.border, color: theme.muted }
                }
                aria-pressed={active}
                onClick={() => setCategory(item)}
              >
                {icon && <img src={icon} alt="" className="size-4 rounded-full object-cover" />}
                {item}
              </button>
            );
          })}
        </nav>

        {category === 'Todos' && !search && popularItems.length > 0 && (
          <section className="mb-11">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ backgroundColor: secondary, color: primary }}
                >
                  <Sparkles size={17} />
                </span>
                <div>
                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--restaurant-primary)]">
                    LOS FAVORITOS
                  </p>
                  <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                    Los más pedidos
                  </h2>
                </div>
              </div>
              <span className="text-xs font-semibold" style={{ color: theme.muted }}>
                De la casa
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popularItems.map((item, index) => (
                <DishCard
                  key={item.id}
                  item={item}
                  primary={primary}
                  design={design}
                  theme={theme}
                  popular
                  index={index}
                  canOrder={isClient}
                  orderingEnabled={data.allowOrders !== false}
                  isAuthenticated={isAuthenticated}
                  onOpen={() => setSelectedItem(item)}
                  onAdd={() => addItem(item)}
                  from={location.pathname}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-10 scroll-mt-32">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl"
                style={{ backgroundColor: secondary, color: primary }}
              >
                <Utensils size={17} />
              </span>
              <div>
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--restaurant-primary)]">
                  DESCUBRE ALGO RICO
                </p>
                <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  {categoryTitle}
                </h2>
              </div>
            </div>
            <span className="text-xs font-semibold" style={{ color: theme.muted }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'platillo' : 'platillos'}
            </span>
          </div>
          {filteredItems.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  primary={primary}
                  design={design}
                  theme={theme}
                  canOrder={isClient}
                  orderingEnabled={data.allowOrders !== false}
                  isAuthenticated={isAuthenticated}
                  onOpen={() => setSelectedItem(item)}
                  onAdd={() => addItem(item)}
                  from={location.pathname}
                />
              ))}
            </div>
          ) : (
            <div
              className="flex min-h-60 flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-10 text-center"
              style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.muted }}
            >
              <Search size={24} className="text-slate-400" />
              <h3 className="mb-1 mt-4 text-base font-bold" style={{ color: theme.ink }}>
                {!allItems.length && !search
                  ? 'Este menú aún no tiene platillos'
                  : 'No encontramos platillos'}
              </h3>
              <p className="mb-4 text-sm">
                {!allItems.length && !search
                  ? 'El negocio todavía no ha publicado sus productos. Vuelve pronto.'
                  : 'Prueba con otra búsqueda o categoría.'}
              </p>
              {(search || category !== 'Todos') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setCategory('Todos');
                  }}
                >
                  Ver todo el menú
                </Button>
              )}
            </div>
          )}
        </section>

        {!isClient && (
          <aside
            className="my-8 flex flex-wrap items-center gap-4 rounded-2xl border p-4 shadow-sm sm:p-5"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: secondary, color: primary }}
            >
              <ShoppingBag size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="text-sm font-bold" style={{ color: theme.ink }}>
                ¿Te gustaría pedir?
              </strong>
              <p className="mt-1 text-xs leading-5" style={{ color: theme.muted }}>
                Inicia sesión como cliente para agregar platillos a tu orden.
              </p>
            </div>
            {user ? (
              <Link
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:brightness-110"
                style={{ backgroundColor: primary, color: theme.onPrimary }}
                to={panelPathFor(user.role)}
              >
                Ir a mi panel <ArrowRight size={15} />
              </Link>
            ) : (
              <Link
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition hover:brightness-110"
                style={{ backgroundColor: primary, color: theme.onPrimary }}
                to="/login"
                state={{ from: location.pathname }}
              >
                Inicia sesión <ArrowRight size={15} />
              </Link>
            )}
          </aside>
        )}

        <footer
          className="flex flex-col items-center justify-center gap-2 border-t py-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: theme.border, color: theme.muted }}
        >
          <span className="inline-flex items-center gap-2 font-extrabold tracking-[0.16em]">
            <img src={LogoPunto} className="h-6 block mx-auto" alt="Logo Punto +" />
          </span>
          <span>Sabores de {data.name}, cerca de ti.</span>
        </footer>
      </main>

      {isClient && orderCount > 0 && (
        <button
          className="fixed bottom-5 left-1/2 z-40 inline-flex min-h-14 -translate-x-1/2 items-center gap-3 rounded-2xl px-3 py-2 shadow-2xl transition hover:brightness-110"
          style={{ backgroundColor: primary, color: theme.onPrimary }}
          onClick={() => setOrderOpen(true)}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-white text-sm font-extrabold text-slate-800">
            {orderCount}
          </span>
          <span className="text-xs font-bold">Ver mi orden</span>
          <strong className="text-xs font-extrabold tabular-nums">
            {currency.format(orderTotal)}
          </strong>
          <ArrowRight size={18} />
        </button>
      )}

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        title={selectedItem?.name ?? 'Detalle del platillo'}
        description={selectedItem?.category ? `Categoría: ${selectedItem.category}` : undefined}
      >
        {selectedItem && (
          <div className="flex flex-col">
            <img
              src={itemImage(selectedItem)}
              alt={selectedItem.name}
              className="h-56 w-full bg-stone-100 object-cover"
            />
            <div className="p-5 sm:p-6">
              <span
                className="text-[10px] font-extrabold uppercase tracking-[0.15em]"
                style={{ color: theme.accentOnLight }}
              >
                {selectedItem.category || 'Especialidad de la casa'}
              </span>
              <p className="mb-4 mt-2 text-sm leading-6 text-slate-600">
                {selectedItem.description || 'Preparado al momento con ingredientes seleccionados.'}
              </p>
              <strong className="text-xl font-extrabold text-slate-900">
                {itemPrice(selectedItem)}
              </strong>
            </div>
            {isClient ? (
              <Button className="mx-5 mb-5 sm:mx-6 sm:mb-6" onClick={() => addItem(selectedItem)}>
                <Plus size={17} /> Agregar a mi orden
              </Button>
            ) : isAuthenticated ? (
              <p className="mx-5 mb-5 text-xs leading-5 text-slate-500 sm:mx-6 sm:mb-6">
                Solo las cuentas de cliente pueden agregar a una orden.
              </p>
            ) : (
              <Button asChild className="mx-5 mb-5 sm:mx-6 sm:mb-6">
                <Link to="/login" state={{ from: location.pathname }}>
                  Inicia sesión como cliente para ordenar
                </Link>
              </Button>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        title="Tu orden"
        description={`De ${data.name} · ${orderCount} ${orderCount === 1 ? 'platillo' : 'platillos'}`}
      >
        <div className="flex max-h-[48dvh] flex-col gap-2.5 overflow-auto py-1">
          {itemsInOrder.length ? (
            itemsInOrder.map((item) => (
              <article
                className="flex items-center gap-3 rounded-xl border border-stone-200 p-2.5"
                key={item.id}
              >
                <img
                  src={itemImage(item)}
                  alt=""
                  className="size-13 shrink-0 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong className="truncate text-xs font-bold text-slate-800">{item.name}</strong>
                  <span className="text-xs font-bold" style={{ color: theme.accentOnLight }}>
                    {itemPrice(item)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-stone-200 p-1 text-xs font-extrabold text-slate-700">
                  <button
                    className="grid size-7 place-items-center rounded-md bg-stone-100 hover:bg-stone-200"
                    style={{ color: theme.accentOnLight }}
                    onClick={() => changeQuantity(item, -1)}
                    aria-label={`Quitar uno de ${item.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{order[item.id]}</span>
                  <button
                    className="grid size-7 place-items-center rounded-md bg-stone-100 hover:bg-stone-200"
                    style={{ color: theme.accentOnLight }}
                    onClick={() => changeQuantity(item, 1)}
                    aria-label={`Agregar uno de ${item.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              Aún no agregas platillos a tu orden.
            </p>
          )}
        </div>
        {itemsInOrder.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4 text-sm text-slate-500">
            <span>Total estimado</span>
            <strong className="text-lg font-extrabold text-slate-900">
              {currency.format(orderTotal)}
            </strong>
          </div>
        )}
        <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-slate-500">
          <Check size={14} style={{ color: theme.accentOnLight }} />
          Tu orden se está armando en este dispositivo.
        </p>
      </Dialog>
    </div>
  );
}

function DishCard({
  item,
  primary,
  design,
  theme,
  popular = false,
  index = 0,
  canOrder,
  orderingEnabled,
  isAuthenticated,
  onOpen,
  onAdd,
  from,
}: {
  item: MenuItem;
  primary: string;
  design: MenuDesign;
  theme: MenuTheme;
  popular?: boolean;
  index?: number;
  canOrder: boolean;
  orderingEnabled: boolean;
  isAuthenticated: boolean;
  onOpen: () => void;
  onAdd: () => void;
  from: string;
}) {
  const compact = design.menuStyle === 'compact';
  const accent = design.cardStyle === 'bold';
  const shape = design.logoShape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const addButton = `absolute bottom-3 right-3 grid size-10 place-items-center ${shape} shadow-lg transition hover:scale-105`;
  const unavailableButton = `absolute bottom-3 right-3 grid size-10 place-items-center ${shape}`;
  return (
    <article
      className={`group relative flex min-w-0 overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg ${cardStyleClass[design.cardStyle]} ${
        popular
          ? `min-h-[250px] flex-col ${compact ? 'min-h-[210px]' : ''}`
          : compact
            ? 'min-h-28 items-stretch'
            : 'min-h-32 items-stretch'
      }`}
      style={{
        backgroundColor: theme.card,
        borderColor: design.cardStyle === 'flat' ? 'transparent' : theme.border,
      }}
      data-dish-card={design.cardStyle}
    >
      {accent && (
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: primary }}
          aria-hidden="true"
        />
      )}
      <button
        className={`flex min-w-0 text-left ${popular ? 'w-full flex-col' : compact ? 'w-full items-center gap-3 p-2.5 pr-14' : 'w-full items-center gap-3 p-3 pr-14'}`}
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalles de ${item.name}`}
      >
        <span
          className={`relative block shrink-0 overflow-hidden ${accent && popular ? 'mt-1' : ''} ${popular ? 'h-40 w-full' : compact ? 'ml-0 size-20 rounded-xl sm:size-22' : 'ml-0 h-24 w-24 rounded-xl sm:h-28 sm:w-28'}`}
          style={{ backgroundColor: theme.surfaceSoft }}
        >
          <img
            src={itemImage(item)}
            alt=""
            className="size-full object-cover transition duration-300 group-hover:scale-105"
            loading={index > 0 ? 'lazy' : 'eager'}
          />
          {popular && (
            <span
              className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm"
              style={{ backgroundColor: primary, color: theme.onPrimary }}
            >
              <Sparkles size={11} /> Favorito
            </span>
          )}
        </span>
        <span
          className={`flex min-w-0 flex-1 flex-col items-start ${popular ? 'gap-1.5 p-3 pb-4' : 'self-stretch py-1'}`}
        >
          <span
            className="text-[9px] font-extrabold uppercase tracking-[0.1em]"
            style={{ color: primary }}
          >
            {item.category || 'De la casa'}
          </span>
          <strong
            className="line-clamp-2 text-sm font-extrabold leading-5"
            style={{ color: theme.ink }}
          >
            {item.name}
          </strong>
          {item.description && (
            <span className="line-clamp-2 text-xs leading-5" style={{ color: theme.muted }}>
              {item.description}
            </span>
          )}
          <span
            className="mt-auto pt-2 text-sm font-extrabold tabular-nums"
            style={{ color: theme.ink }}
          >
            {itemPrice(item)}
          </span>
        </span>
      </button>
      {!orderingEnabled ? (
        <button
          className={unavailableButton}
          type="button"
          disabled
          aria-label="Pedidos no disponibles desde el menú"
          title="Este negocio no recibe pedidos desde el menú digital"
          style={{ backgroundColor: theme.surfaceSoft, color: theme.muted }}
        >
          <Plus size={18} />
        </button>
      ) : canOrder ? (
        <button
          className={addButton}
          type="button"
          onClick={onAdd}
          aria-label={`Agregar ${item.name} a tu orden`}
          style={{ backgroundColor: primary, color: theme.onPrimary }}
        >
          <Plus size={18} />
        </button>
      ) : isAuthenticated ? (
        <button
          className={unavailableButton}
          type="button"
          disabled
          aria-label="Solo clientes pueden agregar a la orden"
          title="Solo clientes pueden agregar a la orden"
          style={{ backgroundColor: theme.surfaceSoft, color: theme.muted }}
        >
          <Plus size={18} />
        </button>
      ) : (
        <Link
          className={unavailableButton}
          to="/login"
          state={{ from }}
          aria-label={`Inicia sesión para agregar ${item.name}`}
          style={{ backgroundColor: theme.surfaceSoft, color: primary }}
        >
          <Plus size={18} />
          <span className="sr-only">Inicia sesión para ordenar</span>
        </Link>
      )}
    </article>
  );
}
