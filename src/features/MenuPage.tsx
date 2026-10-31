import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { AppSplash } from '../components/AppSplash';
import { useSessionStatus } from '../lib/session';
import { panelPathFor } from '../lib/utils';
import type { MenuItem } from '../lib/types';
import { api } from '../services/api';
import { useAuth } from '../stores/auth';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function menuFontStack(font?: 'dm-sans' | 'manrope' | 'serif') {
  if (font === 'manrope') return "'Manrope Variable', 'Manrope', sans-serif";
  if (font === 'serif') return "Georgia, 'Times New Roman', serif";
  return "'DM Sans Variable', 'DM Sans', sans-serif";
}

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
  const isClient = user?.role === 'customer' && Boolean(accessToken) && sessionStatus === 'ready';
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

  if (business.isPending) return <AppSplash message="Preparamos algo rico para ti…" />;

  if (business.isError || !data)
    return (
      <main className="menu-state menu-state-modern">
        <span className="menu-state-icon">
          <Utensils size={24} />
        </span>
        <p className="menu-kicker">PUNTO PLUS · MENÚ DIGITAL</p>
        <h1>Este menú no está disponible</h1>
        <p>
          {business.error instanceof Error
            ? business.error.message
            : 'No encontramos este restaurante o todavía no ha publicado su menú.'}
        </p>
        <Button variant="outline" onClick={() => void business.refetch()}>
          Volver a intentar
        </Button>
      </main>
    );

  const primary = data.primaryColor || '#187f79';
  const secondary = data.secondaryColor || '#f4d5b3';
  const itemsInOrder = allItems.filter((item) => order[item.id]);
  const categoryTitle = category === 'Todos' ? 'Nuestro menú' : category;

  return (
    <div
      className={`restaurant-menu ${data.menuStyle === 'compact' ? 'menu-style-compact' : ''}`}
      style={
        {
          '--restaurant-primary': primary,
          '--restaurant-soft': secondary,
          '--menu-font-family': menuFontStack(data.fontFamily),
        } as React.CSSProperties
      }
    >
      <header className="restaurant-hero">
        {data.banner ? (
          <img src={data.banner} alt="" className="restaurant-hero-image" />
        ) : (
          <div className="restaurant-hero-image restaurant-hero-fallback" />
        )}
        <div className="restaurant-hero-shade" />
        <div className="restaurant-hero-top">
          <Link to="/" className="restaurant-back" aria-label="Volver al inicio">
            <ArrowLeft size={18} />
          </Link>
          <span className="restaurant-brand-mark">
            <Sparkles size={14} /> PUNTO PLUS
          </span>
          {isClient && data.allowOrders !== false ? (
            <button
              className="restaurant-cart-top"
              onClick={() => setOrderOpen(true)}
              aria-label={`Ver orden, ${orderCount} artículos`}
            >
              <ShoppingBag size={18} />
              <span>{orderCount}</span>
            </button>
          ) : (
            <span className="restaurant-cart-spacer" />
          )}
        </div>
        <div className="restaurant-identity">
          <div className="restaurant-logo-wrap" style={{ borderColor: secondary }}>
            {data.logo ? (
              <img src={data.logo} alt={`Logo de ${data.name}`} />
            ) : (
              <Utensils size={28} style={{ color: primary }} />
            )}
          </div>
          <p className="restaurant-eyebrow">MENÚ DEL RESTAURANTE</p>
          <h1>{data.name}</h1>
          {data.description && <p className="restaurant-description">{data.description}</p>}
          <div className="restaurant-meta">
            {(data.address || data.location) && (
              <span>
                <MapPin size={14} />
                {data.address || data.location}
              </span>
            )}
            {data.openingHours && (
              <span>
                <Clock3 size={14} />
                {data.openingHours}
              </span>
            )}
            {(data.phoneNumbers?.length ? data.phoneNumbers : data.phone ? [data.phone] : []).map(
              (phone) => (
                <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} key={phone}>
                  {phone}
                </a>
              ),
            )}
            {data.deliveryAvailable && <span>Reparto a domicilio</span>}
          </div>
        </div>
        <div className="restaurant-hero-bottom" />
      </header>

      <main className="restaurant-content">
        <section className="restaurant-welcome">
          <div>
            <p className="menu-kicker">HECHO PARA DISFRUTAR</p>
            <h2>¿Qué se te antoja?</h2>
            <p>{data.welcomeMessage || 'Explora nuestros favoritos o encuentra algo nuevo.'}</p>
          </div>
          <div className="restaurant-welcome-icon">
            <Utensils size={22} />
          </div>
        </section>
        {data.allowOrders === false && (
          <p className="menu-orders-unavailable">
            Este negocio no recibe pedidos desde el menú digital.
          </p>
        )}

        <label className="menu-search">
          <Search size={19} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en el menú"
            aria-label="Buscar platillos"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
              ×
            </button>
          )}
        </label>

        <nav className="menu-category-nav" aria-label="Categorías del menú">
          {['Todos', ...categories].map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? 'selected' : ''}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {category === 'Todos' && !search && popularItems.length > 0 && (
          <section className="menu-section menu-popular-section">
            <div className="menu-section-heading">
              <div>
                <span className="menu-section-icon">
                  <Sparkles size={15} />
                </span>
                <div>
                  <p className="menu-kicker">LOS FAVORITOS</p>
                  <h2>Los más pedidos</h2>
                </div>
              </div>
              <span className="menu-section-caption">De la casa</span>
            </div>
            <div className="popular-dishes">
              {popularItems.map((item, index) => (
                <DishCard
                  key={item.id}
                  item={item}
                  primary={primary}
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

        <section className="menu-section menu-catalog-section">
          <div className="menu-section-heading">
            <div>
              <span className="menu-section-icon">
                <Utensils size={15} />
              </span>
              <div>
                <p className="menu-kicker">DESCUBRE ALGO RICO</p>
                <h2>{categoryTitle}</h2>
              </div>
            </div>
            <span className="menu-section-caption">
              {filteredItems.length} {filteredItems.length === 1 ? 'platillo' : 'platillos'}
            </span>
          </div>
          {filteredItems.length ? (
            <div className="menu-catalog-grid">
              {filteredItems.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  primary={primary}
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
            <div className="menu-empty-state">
              <Search size={22} />
              <h3>No encontramos platillos</h3>
              <p>Prueba con otra búsqueda o categoría.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setCategory('Todos');
                }}
              >
                Ver todo el menú
              </Button>
            </div>
          )}
        </section>

        {!isClient && (
          <aside className="menu-login-callout">
            <span>
              <ShoppingBag size={19} />
            </span>
            <div>
              <strong>¿Te gustaría pedir?</strong>
              <p>Inicia sesión como cliente para agregar platillos a tu orden.</p>
            </div>
            {user ? (
              <Link className="menu-login-link" to={panelPathFor(user.role)}>
                Ir a mi panel <ArrowRight size={15} />
              </Link>
            ) : (
              <Link className="menu-login-link" to="/login" state={{ from: location.pathname }}>
                Inicia sesión <ArrowRight size={15} />
              </Link>
            )}
          </aside>
        )}

        <footer className="restaurant-footer">
          <span className="restaurant-footer-logo">
            <Sparkles size={14} /> PUNTO PLUS
          </span>
          <span>Sabores de {data.name}, cerca de ti.</span>
        </footer>
      </main>

      {isClient && orderCount > 0 && (
        <button className="menu-floating-order" onClick={() => setOrderOpen(true)}>
          <span className="menu-floating-count">{orderCount}</span>
          <span>Ver mi orden</span>
          <strong>{currency.format(orderTotal)}</strong>
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
        className="menu-detail-dialog"
      >
        {selectedItem && (
          <div className="menu-detail-content">
            <img
              src={itemImage(selectedItem)}
              alt={selectedItem.name}
              className="menu-detail-image"
            />
            <div className="menu-detail-copy">
              <span className="menu-detail-category">
                {selectedItem.category || 'Especialidad de la casa'}
              </span>
              <p>
                {selectedItem.description || 'Preparado al momento con ingredientes seleccionados.'}
              </p>
              <strong>{itemPrice(selectedItem)}</strong>
            </div>
            {isClient ? (
              <Button className="full-width" onClick={() => addItem(selectedItem)}>
                <Plus size={17} /> Agregar a mi orden
              </Button>
            ) : isAuthenticated ? (
              <p className="menu-order-note">
                Solo las cuentas de cliente pueden agregar a una orden.
              </p>
            ) : (
              <Button asChild className="full-width">
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
        className="menu-order-dialog"
      >
        <div className="menu-order-items">
          {itemsInOrder.length ? (
            itemsInOrder.map((item) => (
              <article className="menu-order-row" key={item.id}>
                <img src={itemImage(item)} alt="" />
                <div className="menu-order-item-copy">
                  <strong>{item.name}</strong>
                  <span>{itemPrice(item)}</span>
                </div>
                <div className="menu-quantity-control">
                  <button
                    onClick={() => changeQuantity(item, -1)}
                    aria-label={`Quitar uno de ${item.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{order[item.id]}</span>
                  <button
                    onClick={() => changeQuantity(item, 1)}
                    aria-label={`Agregar uno de ${item.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="menu-order-empty">Aún no agregas platillos a tu orden.</p>
          )}
        </div>
        {itemsInOrder.length > 0 && (
          <div className="menu-order-total">
            <span>Total estimado</span>
            <strong>{currency.format(orderTotal)}</strong>
          </div>
        )}
        <p className="menu-order-note">
          <Check size={14} />
          Tu orden se está armando en este dispositivo.
        </p>
      </Dialog>
    </div>
  );
}

function DishCard({
  item,
  primary,
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
  popular?: boolean;
  index?: number;
  canOrder: boolean;
  orderingEnabled: boolean;
  isAuthenticated: boolean;
  onOpen: () => void;
  onAdd: () => void;
  from: string;
}) {
  return (
    <article className={`dish-card ${popular ? 'dish-card-popular' : ''}`}>
      <button
        className="dish-card-open"
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalles de ${item.name}`}
      >
        <span className="dish-image-wrap">
          <img
            src={itemImage(item)}
            alt=""
            className="dish-image"
            loading={index > 0 ? 'lazy' : 'eager'}
          />
          {popular && (
            <span className="dish-popular-badge">
              <Sparkles size={11} /> Favorito
            </span>
          )}
        </span>
        <span className="dish-card-copy">
          <span className="dish-card-category">{item.category || 'De la casa'}</span>
          <strong>{item.name}</strong>
          {item.description && <span className="dish-card-description">{item.description}</span>}
          <span className="dish-card-price">{itemPrice(item)}</span>
        </span>
      </button>
      {!orderingEnabled ? (
        <button
          className="dish-add-button dish-login-button"
          type="button"
          disabled
          aria-label="Pedidos no disponibles desde el menú"
          title="Este negocio no recibe pedidos desde el menú digital"
        >
          <Plus size={18} />
        </button>
      ) : canOrder ? (
        <button
          className="dish-add-button"
          type="button"
          onClick={onAdd}
          aria-label={`Agregar ${item.name} a tu orden`}
          style={{ backgroundColor: primary }}
        >
          <Plus size={18} />
        </button>
      ) : isAuthenticated ? (
        <button
          className="dish-add-button dish-login-button"
          type="button"
          disabled
          aria-label="Solo clientes pueden agregar a la orden"
          title="Solo clientes pueden agregar a la orden"
        >
          <Plus size={18} />
        </button>
      ) : (
        <Link
          className="dish-add-button dish-login-button"
          to="/login"
          state={{ from }}
          aria-label={`Inicia sesión para agregar ${item.name}`}
        >
          <Plus size={18} />
          <span className="sr-only">Inicia sesión para ordenar</span>
        </Link>
      )}
    </article>
  );
}
