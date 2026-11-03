/**
 * Menú público de un negocio: `/menu/<slug>`.
 *
 * Portada nocturna con la recomendación del día, categorías con emoji,
 * populares, la carta completa, detalle del platillo y un pedido que se envía
 * por WhatsApp. No requiere sesión: se comparte por QR o enlace y funciona
 * igual para cualquier negocio, tomando su logo, colores, horarios y platillos
 * de `public/business/<slug>`.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageCircle, Phone, RotateCcw, Utensils } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppSplash } from '../../components/AppSplash';
import {
  businessPhone,
  categoryEmoji,
  contactMessage,
  formatPrice,
  whatsAppHref,
} from '../../lib/publicMenu';
import type { MenuItem } from '../../lib/types';
import { api, PublicMenuNotFoundError } from '../../services/api';
import {
  PublicMenuProvider,
  useCartTotals,
  usePublicMenu,
  type PublicMenuContextValue,
} from './context';
import { DishSheet } from './DishSheet';
import { useCartCount, useCartFor, usePublicCart } from './store';
import { publicMenuTheme, themeVars } from './theme';

/** Título y descripción del documento: el enlace se comparte por WhatsApp. */
function useDocumentMeta(name: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = name;
    const tag = document.querySelector('meta[name="description"]');
    const previousDescription = tag?.getAttribute('content') ?? null;
    if (tag && description) tag.setAttribute('content', description);
    return () => {
      document.title = previousTitle;
      if (tag && previousDescription !== null) tag.setAttribute('content', previousDescription);
    };
  }, [name, description]);
}

/** Color de la barra del navegador mientras se navega el menú. */
function useMenuThemeColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content') ?? null;
    if (meta) meta.setAttribute('content', color);
    return () => {
      if (meta && previous !== null) meta.setAttribute('content', previous);
    };
  }, [color]);
}

function ProblemScreen({
  title,
  description,
  retry,
}: {
  title: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-4 bg-[#0b0b0f] px-6 text-center text-[#f6f3ee]">
      <span className="grid size-16 place-items-center rounded-3xl bg-white/10">
        <Utensils size={26} />
      </span>
      <p className="text-[10px] font-bold tracking-[0.22em] text-white/50 uppercase">
        Punto Plus · Menú digital
      </p>
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      <p className="max-w-md text-sm leading-6 text-white/60">{description}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10"
          >
            <RotateCcw size={15} /> Volver a intentar
          </button>
        )}
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[#0b0b0f] hover:brightness-95"
        >
          <ArrowLeft size={15} /> Ir a Punto Plus
        </Link>
      </div>
    </main>
  );
}

/** Barra inferior con el total del pedido; se oculta dentro del carrito. */
function OrderBar({ slug, total, count }: { slug: string; total: number; count: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname.endsWith('/carrito')) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-3">
        {count > 0 ? (
          <button
            type="button"
            onClick={() => navigate(`/menu/${encodeURIComponent(slug)}/carrito`)}
            className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl bg-[var(--pm-brand)] px-4 py-2.5 text-[var(--pm-on-brand)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-black/15 text-sm font-black">
                {count}
              </span>
              <span className="text-sm font-bold">Ver mi pedido</span>
            </span>
            <strong className="text-base font-black tabular-nums">{formatPrice(total)}</strong>
          </button>
        ) : (
          <Link
            to={`/menu/${encodeURIComponent(slug)}/menu`}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)]/95 px-4 text-sm font-bold text-[var(--pm-ink)] shadow-[0_16px_36px_-16px_rgba(0,0,0,0.6)] backdrop-blur"
          >
            <Utensils size={17} /> Ver la carta completa
          </Link>
        )}
      </div>
    </div>
  );
}

export function PublicMenuLayout() {
  const { businessSlug: routeSlug, businessId } = useParams<{
    businessSlug?: string;
    businessId?: string;
  }>();
  const slug = routeSlug ?? businessId ?? '';
  const location = useLocation();
  const [sheetItemId, setSheetItemId] = useState<string | null>(null);

  const business = useQuery({
    queryKey: ['public-menu', slug],
    queryFn: () => api.publicBusinessMenu(slug),
    enabled: Boolean(slug),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const hydrate = usePublicCart((state) => state.hydrate);
  const cart = useCartFor(slug);
  const addToCart = usePublicCart((state) => state.add);
  const setQuantity = usePublicCart((state) => state.setQuantity);
  const setNote = usePublicCart((state) => state.setNote);
  const remove = usePublicCart((state) => state.remove);
  const clear = usePublicCart((state) => state.clear);
  const count = useCartCount(slug);

  useEffect(() => {
    if (slug) hydrate(slug);
  }, [slug, hydrate]);

  useEffect(() => {
    setSheetItemId(null);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const data = business.data;
  const items = useMemo(
    () => (data?.menuItems ?? []).filter((item) => item.name.trim()),
    [data?.menuItems],
  );
  const categories = useMemo(() => {
    const fromBusiness = data?.categories?.filter(Boolean) ?? [];
    const fromItems = items
      .map((item) => item.category)
      .filter((value): value is string => Boolean(value));
    return [...new Set([...fromBusiness, ...fromItems])].map((name) => ({
      name,
      emoji: categoryEmoji(name),
    }));
  }, [data?.categories, items]);

  const theme = useMemo(() => (data ? publicMenuTheme(data) : null), [data]);
  const { lines, subtotal } = useCartTotals(items, cart);
  useMenuThemeColor(theme?.surface ?? '#0b0b0f');
  useDocumentMeta(
    data ? `${data.name} · Menú digital` : 'Menú digital',
    data?.description || 'Consulta la carta, arma tu pedido y envíalo por WhatsApp.',
  );

  if (!slug) {
    return (
      <ProblemScreen
        title="Falta el enlace del menú"
        description="Abre el enlace que te compartió el negocio para ver su carta digital."
      />
    );
  }

  if (business.isPending) return <AppSplash message="Preparamos algo rico para ti…" />;

  if (business.isError || !data || !theme) {
    const notFound = business.error instanceof PublicMenuNotFoundError;
    return (
      <ProblemScreen
        title={notFound ? 'No encontramos este menú' : 'No pudimos cargar el menú'}
        description={
          notFound
            ? `No hay un negocio con el enlace “${slug}” o todavía no publica su carta. Revisa el enlace e inténtalo otra vez.`
            : 'Ocurrió un problema al cargar el menú. Inténtalo de nuevo en un momento.'
        }
        retry={notFound ? undefined : () => void business.refetch()}
      />
    );
  }

  const orderable = data.allowOrders !== false;
  const name = data.name.trim();

  const addItem = (item: MenuItem, quantity = 1) => {
    if (!orderable) return;
    addToCart(item.id, quantity);
  };

  const value: PublicMenuContextValue = {
    business: data,
    slug,
    theme,
    name,
    items,
    orderable,
    cart,
    lines,
    subtotal,
    count,
    add: addItem,
    setQuantity,
    setNote,
    remove,
    clear,
    openDish: (item) => setSheetItemId(item.id),
    categories,
  };

  const sheetItem = sheetItemId ? items.find((item) => item.id === sheetItemId) : undefined;

  return (
    <PublicMenuProvider value={value}>
      <div
        data-public-menu="editorial"
        style={themeVars(theme) as React.CSSProperties}
        className="min-h-dvh bg-[var(--pm-surface)] text-[var(--pm-ink)] antialiased"
      >
        <Outlet />
        <OrderBar slug={slug} count={count} total={subtotal} />
      </div>
      {sheetItem && (
        <DishSheet
          item={sheetItem}
          open
          onOpenChange={(open) => {
            if (!open) setSheetItemId(null);
          }}
        />
      )}
    </PublicMenuProvider>
  );
}

/** Enlaces de contacto del pie: WhatsApp y teléfono del negocio. */
export function ContactButtons() {
  const { business } = usePublicMenu();
  const phone = businessPhone(business);
  if (!phone) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={whatsAppHref(phone, contactMessage(business))}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--pm-brand)] px-4 py-2.5 text-xs font-bold text-[var(--pm-on-brand)] transition hover:brightness-110"
      >
        <MessageCircle size={15} /> Escríbenos por WhatsApp
      </a>
      <a
        href={`tel:${phone.replace(/[^\d+]/g, '')}`}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--pm-line)] px-4 py-2.5 text-xs font-bold text-[var(--pm-ink)]"
      >
        <Phone size={15} /> Llamar
      </a>
    </div>
  );
}
