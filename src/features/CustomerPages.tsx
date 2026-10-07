import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Coffee,
  Compass,
  CreditCard,
  Gift,
  Heart,
  Leaf,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Sun,
  Stamp,
  Wheat,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoyalty, useAction } from '../lib/queries';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';
import { LoyaltyCard, BrandIcon } from '../components/LoyaltyCard';
import { PromotionCard } from '../components/PromotionCard';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
import { isDemo } from '../lib/utils';
export interface PageContext {
  search: string;
  userName: string;
  showQR: () => void;
  showCard: (card: Card) => void;
  showPromotion: (promotion: Promotion) => void;
  scan: () => void;
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  return loading ? (
    <div className="skeleton-grid" aria-label="Cargando tarjetas" role="status">
      {[1, 2, 3].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  ) : error ? (
    <EmptyState
      title="No pudimos cargar esta sección"
      description="Comprueba tu conexión e inténtalo de nuevo."
    >
      <Button variant="outline" onClick={retry}>
        Volver a intentar
      </Button>
    </EmptyState>
  ) : null;
}
const matches = (value: string, search: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes(
      search
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    );
export function CardsPage() {
  const { search, userName, showQR, showCard, showPromotion } = useOutletContext<PageContext>();
  const { cards, promotions, favorites } = useLoyalty();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const favorite = useAction(api.toggleFavorite, 'Tus favoritos se actualizaron');
  const joined = (cards.data || []).filter((c) => c.joined);
  const ready = joined.filter((c) => c.stamps >= c.goal).length;
  const filtered = joined
    .filter((c) => matches(c.name, search) && (filter !== 'ready' || c.stamps >= c.goal))
    .sort((a, b) =>
      sort === 'close'
        ? a.goal - a.stamps - (b.goal - b.stamps)
        : sort === 'name'
          ? a.name.localeCompare(b.name)
          : 0,
    );
  const suggested = (promotions.data || [])
    .filter((p) => matches(`${p.title} ${p.business}`, search))
    .slice(0, 3);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <Sun className="sun-symbol" size={16} aria-hidden="true" /> QUÉ BUENO VERTE,{' '}
            {userName.split(' ')[0].toUpperCase()}
          </div>
          <h1>
            Tus favoritos, <span>te dan más.</span>
          </h1>
          <p>Esos lugares a los que siempre vuelves, ahora te recompensan.</p>
        </div>
        <Button onClick={showQR} className="main-qr-button">
          <QrCode size={18} /> Mi código QR <ArrowUpRight size={17} />
        </Button>
      </div>
      <section className="welcome-banner">
        <div className="banner-copy">
          <span className="pill-eyebrow">
            <Sparkles size={13} /> LO LOCAL SE DISFRUTA MÁS
          </span>
          <h2>
            Tu próxima recompensa
            <br />
            está más cerca de lo que crees.
          </h2>
          <p>
            Un café, un antojo, un sello más.
            <br className="mobile-only" /> Sigue haciendo de lo cotidiano algo especial.
          </p>
          <Link to="/app/explorar" className="text-link">
            Encuentra tu próximo favorito <ArrowRight size={16} />
          </Link>
        </div>
        <div className="banner-photo">
          <img
            src="/images/coffee.webp"
            alt="Dos cafés de especialidad, el inicio de una buena mañana"
          />
          <div className="photo-overlay" />
          <span className="photo-caption">
            <span>Hecho en tu barrio.</span>
            <Heart size={14} />
          </span>
        </div>
        <div className="floating-stamp">
          <BadgeCheck size={26} />
          <span>
            Pequeñas visitas.
            <br />
            <strong>Grandes sonrisas.</strong>
          </span>
        </div>
      </section>
      <div className="stats-row">
        <div className="stat">
          <span className="stat-icon orange">
            <CreditCard size={20} />
          </span>
          <div>
            <strong>
              {cards.isSuccess ? joined.length : '—'} <span>tarjetas activas</span>
            </strong>
            <small>Tus lugares de siempre</small>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon green">
            <Stamp size={20} />
          </span>
          <div>
            <strong>
              {cards.isSuccess ? joined.reduce((s, c) => s + c.stamps, 0) : '—'}{' '}
              <span>sellos acumulados</span>
            </strong>
            <small>Cada visita tiene su premio</small>
          </div>
        </div>
        <Link className="stat reward-stat" to="/app/recompensas">
          <span className="stat-icon purple">
            <Gift size={20} />
          </span>
          <div>
            <strong>
              {cards.isSuccess ? ready : '—'}{' '}
              <span>{ready === 1 ? 'recompensa lista' : 'recompensas listas'}</span>
            </strong>
            <small>
              Un gusto que ya te ganaste <ArrowRight size={12} />
            </small>
          </div>
          <ArrowUpRight className="stat-arrow" size={19} />
        </Link>
      </div>
      <section className="section">
        <div className="section-title">
          <h2>
            Mis tarjetas <span className="count-badge">{joined.length}</span>
          </h2>
          <label className="sort-control">
            <span className="sr-only">Ordenar tarjetas</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="default">Más recientes</option>
              <option value="close">Más cerca del premio</option>
              <option value="name">Nombre del negocio</option>
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
        <div className="filter-tabs">
          <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
            Todas mis tarjetas
          </button>
          <button onClick={() => setFilter('ready')} className={filter === 'ready' ? 'active' : ''}>
            Con recompensa <span>{ready}</span>
          </button>
        </div>
        <QueryState
          loading={cards.isPending}
          error={cards.isError}
          retry={() => void cards.refetch()}
        />
        {cards.isSuccess &&
          (filtered.length ? (
            <div className="loyalty-grid">
              {filtered.map((card, i) => (
                <LoyaltyCard key={card.id} card={card} index={i} onClick={() => showCard(card)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={search ? 'No encontramos esa tarjeta' : 'Tu próxima historia empieza aquí'}
              description={
                search
                  ? 'Prueba con otro nombre o cambia el filtro.'
                  : 'Descubre un negocio y agrega tu primera tarjeta.'
              }
            >
              <Button asChild variant="outline">
                <Link to="/app/explorar">Explorar negocios</Link>
              </Button>
            </EmptyState>
          ))}
      </section>
      <section className="section discover-section">
        <div className="section-title">
          <div>
            <div className="little-label">UN BUEN PLAN CERCA DE TI</div>
            <h2>
              Algo nuevo que te va a encantar <Sparkles size={19} className="inline-sparkle" />
            </h2>
          </div>
          <Link to="/app/explorar" className="text-link subtle-link">
            Explorar todo <ArrowRight size={16} />
          </Link>
        </div>
        <QueryState
          loading={promotions.isPending}
          error={promotions.isError}
          retry={() => void promotions.refetch()}
        />
        <div className="promotion-grid">
          {suggested.map((p) => (
            <PromotionCard
              key={p.id}
              promotion={p}
              favorite={favorites.data?.includes(p.id) || false}
              pending={favorite.isPending}
              onFavorite={() => favorite.mutate(p.id)}
              onClick={() => showPromotion(p)}
            />
          ))}
        </div>
        {promotions.isSuccess && !suggested.length && (
          <p className="muted">No hay promociones que coincidan con tu búsqueda.</p>
        )}
      </section>
      <div className="bottom-note">
        <Heart size={14} /> Comprar local se siente bien. Volver tiene su recompensa.
      </div>
    </>
  );
}
export function ExplorePage() {
  const { search, showCard, showPromotion } = useOutletContext<PageContext>();
  const { cards, promotions, favorites } = useLoyalty();
  const [category, setCategory] = useState('Todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorite = useAction(api.toggleFavorite, 'Tus favoritos se actualizaron');
  const categories = [
    { name: 'Todos', icon: Compass },
    { name: 'Cafetería', icon: Coffee },
    { name: 'Panadería', icon: Wheat },
    { name: 'Bebidas', icon: Leaf },
    { name: 'Bienestar', icon: Heart },
  ];
  const filtered = (promotions.data || []).filter(
    (p) =>
      (category === 'Todos' || category === p.category) &&
      matches(p.business + p.title, search) &&
      (!onlyFavorites || favorites.data?.includes(p.id)),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">TU BARRIO TIENE MUCHO QUE DAR</div>
          <h1>
            Un nuevo <span>favorito te espera.</span>
          </h1>
          <p>Descubre lugares con personalidad. Y recompensas que se antojan.</p>
        </div>
        <span className="location-chip">
          <MapPin size={15} /> Ciudad de México
        </span>
      </div>
      <div className="explore-toolbar">
        <div className="category-filters">
          {categories.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={category === name ? 'active' : ''}
              onClick={() => setCategory(name)}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </div>
        <button
          className={`save-filter ${onlyFavorites ? 'active' : ''}`}
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          aria-pressed={onlyFavorites}
        >
          <Heart size={17} /> Guardados
        </button>
      </div>
      <section className="section">
        <div className="section-title">
          <h2>Pequeños antojos, grandes planes</h2>
          <span className="muted">{filtered.length} promociones</span>
        </div>
        <QueryState
          loading={promotions.isPending}
          error={promotions.isError}
          retry={() => void promotions.refetch()}
        />
        <div className="promotion-grid">
          {filtered.map((p) => (
            <PromotionCard
              key={p.id}
              promotion={p}
              favorite={favorites.data?.includes(p.id) || false}
              pending={favorite.isPending}
              onFavorite={() => favorite.mutate(p.id)}
              onClick={() => showPromotion(p)}
            />
          ))}
        </div>
        {promotions.isSuccess && !filtered.length && (
          <EmptyState
            title="Por aquí aún no hay promociones"
            description="Prueba otra categoría o guarda tus promociones favoritas."
          />
        )}
      </section>
      <section className="section">
        <div className="section-title">
          <h2>Conoce a tus vecinos</h2>
          <span className="little-label">
            {isDemo ? 'NEGOCIOS DE DEMOSTRACIÓN' : 'NEGOCIOS PARTICIPANTES'}
          </span>
        </div>
        <QueryState
          loading={cards.isPending}
          error={cards.isError}
          retry={() => void cards.refetch()}
        />
        <div className="business-grid">
          {(cards.data || [])
            .filter(
              (c) => (category === 'Todos' || category === c.category) && matches(c.name, search),
            )
            .map((c) => (
              <button className="business-tile" key={c.id} onClick={() => showCard(c)}>
                <span className={`business-avatar ${c.theme}`}>
                  <BrandIcon icon={c.icon} size={28} />
                </span>
                <h3>{c.name}</h3>
                <p>{c.tagline}</p>
                <span className="business-location">
                  <MapPin size={13} />
                  {c.location}
                </span>
                <span className={`business-join ${c.joined ? 'joined' : ''}`}>
                  {c.joined ? (
                    <>
                      <Check size={14} /> En mis tarjetas
                    </>
                  ) : (
                    <>
                      Conocer y unirme <ArrowRight size={14} />
                    </>
                  )}
                </span>
              </button>
            ))}
        </div>
      </section>
    </>
  );
}
export function RewardsPage() {
  const { search, showCard } = useOutletContext<PageContext>();
  const { cards, activity } = useLoyalty();
  const ready = (cards.data || []).filter(
    (c) => c.joined && c.stamps >= c.goal && matches(c.name, search),
  );
  const near = (cards.data || [])
    .filter((c) => c.joined && c.stamps < c.goal && matches(c.name, search))
    .sort((a, b) => a.goal - a.stamps - (b.goal - b.stamps));
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">TE LO GANASTE, VISITA A VISITA</div>
          <h1>
            Lo bueno <span>es para ti.</span>
          </h1>
          <p>Transforma tus sellos en esos pequeños gustos que alegran el día.</p>
        </div>
        <div className="large-page-icon">
          <Gift size={30} />
        </div>
      </div>
      <section className="section">
        <div className="section-title">
          <h2>
            Listas para disfrutar <span className="count-badge">{ready.length}</span>
          </h2>
        </div>
        <QueryState
          loading={cards.isPending}
          error={cards.isError}
          retry={() => void cards.refetch()}
        />
        <div className="loyalty-grid">
          {ready.map((c) => (
            <LoyaltyCard card={c} key={c.id} onClick={() => showCard(c)} />
          ))}
        </div>
        {cards.isSuccess && !ready.length && (
          <EmptyState
            title="Lo mejor está por llegar"
            description="Sigue visitando tus negocios favoritos para completar una tarjeta."
          />
        )}
      </section>
      <section className="section">
        <div className="section-title">
          <h2>Ya casi son tuyas</h2>
          <span className="muted">Un paso más cerca</span>
        </div>
        <div className="near-rewards">
          {near.map((c) => (
            <button key={c.id} className="near-card" onClick={() => showCard(c)}>
              <span className={`business-avatar ${c.theme}`}>
                <BrandIcon icon={c.icon} />
              </span>
              <div>
                <h3>{c.reward}</h3>
                <p>{c.name}</p>
                <div className="progress-track">
                  <div style={{ width: `${(c.stamps / c.goal) * 100}%` }} />
                </div>
              </div>
              <span>
                Faltan {c.goal - c.stamps} sellos <ArrowUpRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Tus recompensas canjeadas</h2>
        <QueryState
          loading={activity.isPending}
          error={activity.isError}
          retry={() => void activity.refetch()}
        />
        {activity.isSuccess && !activity.data.some((a) => a.type === 'reward') ? (
          <p className="muted history-placeholder">
            Aquí guardaremos los pequeños gustos que ya disfrutaste.
          </p>
        ) : (
          <div className="activity-list">
            {activity.data
              ?.filter((a) => a.type === 'reward')
              .map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="stat-icon purple">
                    <Gift size={20} />
                  </span>
                  <div>
                    <h3>{a.title}</h3>
                    <p>{a.business}</p>
                  </div>
                  <time>{format(new Date(a.date), 'd MMM yyyy', { locale: es })}</time>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
export function ActivityPage() {
  const { search } = useOutletContext<PageContext>();
  const { activity } = useLoyalty();
  const [filter, setFilter] = useState('all');
  const entries = (activity.data || []).filter(
    (a) => (filter === 'all' || filter === a.type) && matches(a.business + a.title, search),
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">CADA VISITA CUENTA UNA HISTORIA</div>
          <h1>
            Tu camino, <span>punto a punto.</span>
          </h1>
          <p>Tus visitas, tus sellos y todos esos buenos momentos.</p>
        </div>
      </div>
      <div className="filter-tabs activity-tabs">
        {[
          { id: 'all', name: 'Toda la actividad' },
          { id: 'stamp', name: 'Sellos' },
          { id: 'reward', name: 'Recompensas' },
        ].map((f) => (
          <button
            key={f.id}
            className={filter === f.id ? 'active' : ''}
            onClick={() => setFilter(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>
      <QueryState
        loading={activity.isPending}
        error={activity.isError}
        retry={() => void activity.refetch()}
      />
      <div className="activity-list">
        {entries.map((a) => (
          <div className="activity-item" key={a.id}>
            <span
              className={`stat-icon ${a.type === 'reward' ? 'purple' : a.type === 'stamp' ? 'green' : 'orange'}`}
            >
              {a.type === 'reward' ? (
                <Gift size={20} />
              ) : a.type === 'stamp' ? (
                <Stamp size={20} />
              ) : (
                <Heart size={20} />
              )}
            </span>
            <div>
              <h3>{a.title}</h3>
              <p>
                {a.business}{' '}
                <span>· {format(new Date(a.date), 'd MMM, HH:mm', { locale: es })}</span>
              </p>
            </div>
            <span className={`activity-amount ${a.type === 'stamp' ? 'positive' : ''}`}>
              {a.type === 'stamp'
                ? `+${a.amount} sello`
                : a.type === 'reward'
                  ? 'Canjeada'
                  : 'Nueva tarjeta'}
            </span>
          </div>
        ))}
      </div>
      {activity.isSuccess && !entries.length && (
        <EmptyState
          title="Una historia por comenzar"
          description="Tus próximas visitas y recompensas aparecerán aquí."
        />
      )}
    </>
  );
}
