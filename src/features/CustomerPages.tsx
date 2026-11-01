import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronDown,
  Gift,
  Heart,
  MapPin,
  QrCode,
  Search,
  ScanLine,
  Stamp,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLoyalty, useAction } from '../lib/queries';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';
import { LoyaltyCard, BrandIcon } from '../components/LoyaltyCard';
import { PromotionCard } from '../components/PromotionCard';
import { Button } from '../components/ui/button';
import { api } from '../services/api';
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
  const { search, showQR, showCard, scan } = useOutletContext<PageContext>();
  const { cards } = useLoyalty();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('default');
  const joined = (cards.data || []).filter((card) => card.joined);
  const ready = joined.filter((card) => card.stamps >= card.goal).length;
  const filtered = joined
    .filter(
      (card) => matches(card.name, search) && (filter !== 'ready' || card.stamps >= card.goal),
    )
    .sort((a, b) =>
      sort === 'close'
        ? a.goal - a.stamps - (b.goal - b.stamps)
        : sort === 'name'
          ? a.name.localeCompare(b.name)
          : 0,
    );

  return (
    <>
      <div className="page-intro customer-cards-intro">
        <div>
          <div className="eyebrow">TU COMUNIDAD, TUS RECOMPENSAS</div>
          <h1>
            Tus tarjetas <span>de lealtad.</span>
          </h1>
          <p>Consulta tus tarjetas disponibles y sigue sumando sellos en tus negocios favoritos.</p>
        </div>
        <div className="customer-card-actions">
          <Button onClick={scan} className="main-qr-button" aria-label="Escanear una nueva compra">
            <ScanLine size={18} /> Escanear compra <ArrowUpRight size={17} />
          </Button>
          <Button onClick={showQR} variant="outline">
            <QrCode size={17} /> Mi código QR
          </Button>
        </div>
      </div>
      <section className="section customer-cards-section">
        <div className="section-title">
          <h2>
            Tarjetas disponibles <span className="count-badge">{joined.length}</span>
          </h2>
          <label className="sort-control">
            <span className="sr-only">Ordenar tarjetas</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
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
              {filtered.map((card, index) => (
                <LoyaltyCard
                  key={card.id}
                  card={card}
                  index={index}
                  onClick={() => showCard(card)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={search ? 'No encontramos esa tarjeta' : 'Tu próxima historia empieza aquí'}
              description={
                search
                  ? 'Prueba con otro nombre o cambia el filtro.'
                  : 'Descubre un negocio cercano y agrega tu primera tarjeta.'
              }
            >
              <Button asChild variant="outline">
                <Link to="/app/cerca-de-mi">Ver negocios cerca de mí</Link>
              </Button>
            </EmptyState>
          ))}
      </section>
      <div className="customer-secondary-links">
        <Link to="/app/recompensas">Ver mis recompensas</Link>
        <Link to="/app/actividad">Consultar mi actividad</Link>
      </div>
    </>
  );
}

export function PromotionsPage() {
  const { search, showPromotion } = useOutletContext<PageContext>();
  const { cards, promotions, favorites, activity } = useLoyalty();
  const [category, setCategory] = useState('Todas');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favorite = useAction(api.toggleFavorite, 'Tus favoritos se actualizaron');
  const purchasedCards = (cards.data || []).filter((card) => card.joined && card.stamps > 0);
  const purchasedIds = new Set(purchasedCards.map((card) => card.businessId));
  const purchasedNames = new Set([
    ...purchasedCards.map((card) => normalizeText(card.name)),
    ...(activity.data || [])
      .filter((entry) => entry.type === 'stamp')
      .map((entry) => normalizeText(entry.business)),
  ]);
  const eligiblePromotions = (promotions.data || []).filter(
    (promotion) =>
      purchasedIds.has(promotion.businessId) ||
      purchasedNames.has(normalizeText(promotion.business)),
  );
  const categories = [
    'Todas',
    ...new Set(eligiblePromotions.map((promotion) => promotion.category)),
  ];
  const filtered = eligiblePromotions.filter(
    (promotion) =>
      (category === 'Todas' || category === promotion.category) &&
      matches(`${promotion.business} ${promotion.title} ${promotion.description}`, search) &&
      (!onlyFavorites || favorites.data?.includes(promotion.id)),
  );
  const retry = () => {
    void cards.refetch();
    void promotions.refetch();
    void activity.refetch();
  };

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">BENEFICIOS DE TUS LUGARES FAVORITOS</div>
          <h1>
            Promociones <span>para ti.</span>
          </h1>
          <p>Ofertas de negocios donde ya registraste una compra.</p>
        </div>
        <span className="location-chip">
          <Gift size={15} /> Solo de tus negocios
        </span>
      </div>
      <div className="explore-toolbar">
        <div className="category-filters" aria-label="Filtrar promociones por categoría">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              className={category === name ? 'active' : ''}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`save-filter ${onlyFavorites ? 'active' : ''}`}
          onClick={() => setOnlyFavorites((current) => !current)}
          aria-pressed={onlyFavorites}
        >
          <Heart size={17} /> Guardadas
        </button>
      </div>
      <section className="section">
        <div className="section-title">
          <h2>Promociones de tus negocios</h2>
          <span className="muted">{filtered.length} promociones</span>
        </div>
        <QueryState
          loading={cards.isPending || promotions.isPending || activity.isPending}
          error={cards.isError || promotions.isError || activity.isError}
          retry={retry}
        />
        <div className="promotion-grid">
          {filtered.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              favorite={favorites.data?.includes(promotion.id) || false}
              pending={favorite.isPending}
              onFavorite={() => favorite.mutate(promotion.id)}
              onClick={() => showPromotion(promotion)}
            />
          ))}
        </div>
        {cards.isSuccess && promotions.isSuccess && activity.isSuccess && !filtered.length && (
          <EmptyState
            title={
              eligiblePromotions.length
                ? 'No hay promociones con este filtro'
                : 'Aún no hay promociones para ti'
            }
            description={
              eligiblePromotions.length
                ? 'Prueba otra categoría o quita el filtro de guardadas.'
                : 'Cuando registres una compra en un negocio, aquí verás sus promociones disponibles.'
            }
          />
        )}
      </section>
    </>
  );
}

function distanceInKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude?: number; longitude?: number },
) {
  if (destination.latitude === undefined || destination.longitude === undefined) return undefined;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(destination.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function NearbyPage() {
  const { search } = useOutletContext<PageContext>();
  const { cards } = useLoyalty();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'
  >('idle');
  const businesses = (cards.data || []).filter((card) =>
    matches(`${card.name} ${card.category} ${card.location} ${card.address || ''}`, search),
  );
  const selected = businesses.find((business) => business.id === selectedId) ?? businesses[0];
  const query = selected
    ? selected.latitude !== undefined && selected.longitude !== undefined
      ? `${selected.latitude},${selected.longitude}`
      : `${selected.name}, ${selected.address || selected.location}, Ciudad de México`
    : position
      ? `${position.latitude},${position.longitude}`
      : 'negocios Punto Plus en Ciudad de México';
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  const mapUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(googleMapsApiKey)}&q=${encodeURIComponent(query)}&zoom=14`
    : null;
  const externalMapUrl = selected
    ? position
      ? `https://www.google.com/maps/dir/?api=1&origin=${position.latitude},${position.longitude}&destination=${encodeURIComponent(`${selected.name}, ${selected.address || selected.location}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name}, ${selected.address || selected.location}`)}`
    : 'https://www.google.com/maps/search/?api=1&query=negocios+Punto+Plus';

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationStatus('ready');
      },
      (error) => {
        setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">NEGOCIOS QUE FORMAN PARTE DE PUNTO PLUS</div>
          <h1>
            Cerca <span>de ti.</span>
          </h1>
          <p>Encuentra los negocios participantes y consulta su ubicación en Google Maps.</p>
        </div>
        <Button onClick={requestLocation} disabled={locationStatus === 'loading'}>
          <MapPin size={17} />
          {locationStatus === 'loading' ? 'Buscando ubicación…' : 'Usar mi ubicación'}
        </Button>
      </div>
      {locationStatus !== 'idle' && (
        <p className="location-permission-note" role="status">
          {locationStatus === 'ready'
            ? 'Ubicación activada. Puedes abrir la ruta al negocio seleccionado en Google Maps.'
            : locationStatus === 'denied'
              ? 'No tenemos permiso para usar tu ubicación. Puedes habilitarlo en los ajustes del navegador.'
              : locationStatus === 'unavailable'
                ? 'No fue posible obtener tu ubicación en este dispositivo. Aún puedes explorar los negocios.'
                : 'Solicitando permiso de ubicación…'}
        </p>
      )}
      <section className="customer-map-layout" aria-label="Mapa y negocios cercanos">
        <div className="customer-map-panel">
          <div className="customer-map-heading">
            <div>
              <h2>{selected ? selected.name : 'Mapa de negocios'}</h2>
              <p>
                {selected
                  ? selected.address || selected.location
                  : 'Selecciona un negocio del listado'}
              </p>
            </div>
            {selected && (
              <a href={externalMapUrl} target="_blank" rel="noreferrer">
                Abrir ruta <ArrowUpRight size={14} />
              </a>
            )}
          </div>
          {cards.isPending ? (
            <div className="customer-map-placeholder" role="status">
              Cargando negocios…
            </div>
          ) : cards.isError ? (
            <div className="customer-map-placeholder">
              <QueryState loading={false} error retry={() => void cards.refetch()} />
            </div>
          ) : !mapUrl ? (
            <div className="customer-map-placeholder" role="status">
              <div>
                <MapPin size={22} />
                <p>Configura VITE_GOOGLE_MAPS_API_KEY para cargar el mapa de Google.</p>
              </div>
            </div>
          ) : (
            <iframe
              className="customer-google-map"
              title={
                selected ? `Google Maps: ${selected.name}` : 'Google Maps de negocios Punto Plus'
              }
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
          <p className="map-data-note">
            La ubicación se busca en Google Maps usando el domicilio disponible del negocio. Si
            falta una dirección precisa, el marcador puede ser aproximado.
          </p>
        </div>
        <div className="customer-map-businesses">
          <div className="section-title">
            <h2>Negocios participantes</h2>
            <span className="count-badge">{businesses.length}</span>
          </div>
          <QueryState
            loading={cards.isPending}
            error={cards.isError}
            retry={() => void cards.refetch()}
          />
          {cards.isSuccess && businesses.length > 0 ? (
            <div className="customer-map-business-list">
              {businesses.map((business) => {
                const distance = position ? distanceInKm(position, business) : undefined;
                const distanceLabel =
                  distance === undefined
                    ? position
                      ? 'Distancia no disponible'
                      : business.distance
                    : distance < 1
                      ? `${Math.round(distance * 1000)} m`
                      : `${distance.toFixed(1)} km`;
                return (
                  <button
                    type="button"
                    key={business.id}
                    className={`customer-map-business ${selected?.id === business.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(business.id)}
                  >
                    <span className={`business-avatar ${business.theme}`}>
                      <BrandIcon icon={business.icon} size={23} />
                    </span>
                    <span className="customer-map-business-copy">
                      <strong>{business.name}</strong>
                      <small>{business.address || business.location}</small>
                    </span>
                    <span className="customer-map-distance">{distanceLabel}</span>
                  </button>
                );
              })}
            </div>
          ) : cards.isSuccess ? (
            <EmptyState
              title={search ? 'No encontramos negocios' : 'Aún no hay negocios disponibles'}
              description={
                search ? 'Prueba con otra búsqueda.' : 'Los negocios Punto Plus aparecerán aquí.'
              }
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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
