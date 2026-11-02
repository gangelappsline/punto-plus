import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronDown,
  Gift,
  LocateFixed,
  MapPin,
  QrCode,
  Search,
  ScanLine,
  Store,
} from 'lucide-react';
import { useCards, useNearMe, usePromotions } from '../lib/queries';
import {
  readLocationPermission,
  readStoredLocation,
  rememberLocationDenied,
  requestCoordinates,
  storeLocation,
  type Coordinates,
} from '../lib/geolocation';
import { formatDistanceKm } from '../lib/utils';
import type { LoyaltyCard as Card, NearbyBusiness, Promotion } from '../lib/types';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { NearbyGoogleMap } from '../components/NearbyGoogleMap';
import { PromotionCard } from '../components/PromotionCard';
import { Button } from '../components/ui/button';
import { NearbyBusinessDialog } from './Dialogs';
export interface PageContext {
  search: string;
  userName: string;
  showCard: (card: Card) => void;
  showPromotion: (promotion: Promotion) => void;
  scan: () => void;
  confirmPurchase: () => void;
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
  const { search, showCard, scan, confirmPurchase } = useOutletContext<PageContext>();
  const cards = useCards();
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
      <div className="mt-6">
        <div>
          <h1>
            Tus tarjetas <span>de lealtad.</span>
          </h1>
          <p>Consulta tus tarjetas disponibles y sigue sumando sellos en tus negocios favoritos.</p>
        </div>
        <div className="customer-card-actions">
          <Button
            onClick={scan}
            className="main-qr-button"
            aria-label="Escanear un negocio participante"
          >
            <ScanLine size={18} /> Escanear negocio <ArrowUpRight size={17} />
          </Button>
          <Button
            variant="outline"
            className="main-qr-button purchase-confirm-button"
            onClick={confirmPurchase}
          >
            <QrCode size={18} /> Confirmar compra
          </Button>
        </div>
      </div>
      <section className="section customer-cards-section">
        <div className="section-title">
          <h2>
            Tarjetas disponibles <span className="count-badge ml-2">{joined.length}</span>
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
    </>
  );
}

export function PromotionsPage() {
  const { search, showPromotion } = useOutletContext<PageContext>();
  const promotions = usePromotions();
  const [category, setCategory] = useState('Todas');
  const availablePromotions = promotions.data || [];
  const categories = [
    'Todas',
    ...new Set(availablePromotions.map((promotion) => promotion.category)),
  ];
  const filtered = availablePromotions.filter(
    (promotion) =>
      (category === 'Todas' || category === promotion.category) &&
      matches(`${promotion.business} ${promotion.title} ${promotion.description}`, search),
  );

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">BENEFICIOS DE TUS LUGARES FAVORITOS</div>
          <h1>
            Promociones <span>para ti.</span>
          </h1>
          <p>Ofertas de los negocios que forman parte de Punto Plus.</p>
        </div>
        <span className="location-chip">
          <Gift size={15} /> Beneficios para ti
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
      </div>
      <section className="section">
        <div className="section-title">
          <h2>Promociones para ti</h2>
          <span className="text-[13px] text-muted">{filtered.length} promociones</span>
        </div>
        <QueryState
          loading={promotions.isPending}
          error={promotions.isError}
          retry={() => void promotions.refetch()}
        />
        <div className="promotion-grid">
          {filtered.map((promotion) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              onClick={() => showPromotion(promotion)}
            />
          ))}
        </div>
        {promotions.isSuccess && !filtered.length && (
          <EmptyState
            title={search ? 'No encontramos promociones' : 'Aún no hay promociones para ti'}
            description={
              search
                ? 'Prueba con otro nombre o cambia la categoría.'
                : 'Cuando haya promociones disponibles, aparecerán aquí.'
            }
          />
        )}
      </section>
    </>
  );
}

export function NearbyPage() {
  const { search } = useOutletContext<PageContext>();
  const initialPosition = readStoredLocation();
  const [position, setPosition] = useState<Coordinates | null>(initialPosition);
  const [locationStatus, setLocationStatus] = useState<
    'loading' | 'ready' | 'denied' | 'unavailable'
  >(initialPosition ? 'ready' : 'loading');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<NearbyBusiness | null>(null);
  const businessesQuery = useNearMe(position);

  // La ubicación se resuelve sola al abrir la sección: si el cliente ya dio
  // permiso (o dejó coordenadas guardadas) no se vuelve a preguntar nada.
  useEffect(() => {
    let active = true;
    const stored = readStoredLocation();
    void (async () => {
      const permission = await readLocationPermission();
      if (!active) return;
      if (permission === 'denied') {
        setLocationStatus('denied');
        return;
      }
      if (permission === 'unknown' && stored) {
        setLocationStatus('ready');
        return;
      }
      if (!stored) setLocationStatus('loading');
      setUpdatingLocation(true);
      const result = await requestCoordinates();
      if (!active) return;
      setUpdatingLocation(false);
      if (result.coordinates) {
        storeLocation(result.coordinates);
        setPosition(result.coordinates);
        setLocationStatus('ready');
        return;
      }
      if (result.failure === 'denied') {
        rememberLocationDenied();
        setLocationStatus('denied');
        return;
      }
      if (!stored) setLocationStatus('unavailable');
    })();
    return () => {
      active = false;
    };
  }, []);

  async function updateLocation() {
    setUpdatingLocation(true);
    if (!position) setLocationStatus('loading');
    const result = await requestCoordinates();
    setUpdatingLocation(false);
    if (result.coordinates) {
      storeLocation(result.coordinates);
      setPosition(result.coordinates);
      setLocationStatus('ready');
      return;
    }
    if (result.failure === 'denied') rememberLocationDenied();
    setLocationStatus(result.failure);
  }

  const businesses = useMemo(
    () =>
      (businessesQuery.data || []).filter((business) =>
        matches(
          `${business.name} ${business.category} ${business.location} ${business.address || ''}`,
          search,
        ),
      ),
    [businessesQuery.data, search],
  );
  const waitingForPosition = !position && (locationStatus === 'loading' || updatingLocation);
  const locating = waitingForPosition || updatingLocation;
  const mapBusy = waitingForPosition || (Boolean(position) && businessesQuery.isPending);
  const statusMessage = waitingForPosition
    ? 'Buscando tu ubicación…'
    : !position && locationStatus === 'denied'
      ? 'Activa la ubicación en tu navegador para ver negocios cerca.'
      : !position && locationStatus === 'unavailable'
        ? 'No pudimos obtener tu ubicación.'
        : position && businessesQuery.isPending
          ? 'Buscando negocios cercanos…'
          : null;

  return (
    <>
      <div className="page-intro nearby-intro">
        <div>
          <h1>
            Cerca <span>de ti.</span>
          </h1>
          <p>Negocios participantes a tu alrededor.</p>
        </div>
        <button
          type="button"
          className="location-chip nearby-location-chip"
          onClick={() => void updateLocation()}
          disabled={locating}
        >
          <MapPin size={15} />
          {locationStatus === 'ready'
            ? 'Ubicación activa'
            : locating
              ? 'Buscando…'
              : locationStatus === 'denied'
                ? 'Ubicación bloqueada'
                : 'Activar ubicación'}
        </button>
      </div>
      <section
        className={`nearby-map-card${!mapBusy && businesses.length ? ' has-strip' : ''}`}
        aria-label="Mapa y negocios cercanos"
      >
        <NearbyGoogleMap
          businesses={businesses}
          center={position}
          userPosition={position}
          selectedId={selectedBusiness?.id}
          onSelect={setSelectedBusiness}
        />
        <div className="nearby-map-top">
          <span className="nearby-map-count">
            <Store size={14} aria-hidden="true" />
            {businesses.length} {businesses.length === 1 ? 'negocio cerca' : 'negocios cerca'}
          </span>
          <button
            type="button"
            className="nearby-map-recenter"
            onClick={() => void updateLocation()}
            disabled={locating}
            aria-label="Actualizar mi ubicación"
            title="Actualizar mi ubicación"
          >
            <LocateFixed size={16} />
          </button>
        </div>
        {statusMessage && (
          <div className="nearby-map-status" role="status">
            <p>{statusMessage}</p>
            {(locationStatus === 'denied' || locationStatus === 'unavailable') && !locating && (
              <Button variant="outline" onClick={() => void updateLocation()}>
                Volver a intentar
              </Button>
            )}
          </div>
        )}
        {!mapBusy && !statusMessage && businessesQuery.isSuccess && !businesses.length && (
          <div className="nearby-map-status" role="status">
            <p>
              {search ? 'No encontramos negocios con esa búsqueda.' : 'Aún no hay negocios cerca.'}
            </p>
          </div>
        )}
        {businessesQuery.isError && (
          <div className="nearby-map-status" role="status">
            <p>No pudimos cargar los negocios cercanos.</p>
            <Button variant="outline" onClick={() => void businessesQuery.refetch()}>
              Volver a intentar
            </Button>
          </div>
        )}
        {!mapBusy && businesses.length > 0 && (
          <div className="nearby-strip" aria-label="Negocios cercanos">
            {businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                className="nearby-strip-item"
                onClick={() => setSelectedBusiness(business)}
                aria-label={`Ver información de ${business.name}`}
              >
                <span className="business-avatar">
                  {business.logo ? (
                    <img src={business.logo} alt="" />
                  ) : (
                    <Store size={18} aria-hidden="true" />
                  )}
                </span>
                <span className="nearby-strip-copy">
                  <strong>{business.name}</strong>
                  <small>{formatDistanceKm(business.distanceKm)}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <NearbyBusinessDialog
        business={selectedBusiness}
        origin={position}
        onClose={() => setSelectedBusiness(null)}
      />
    </>
  );
}
