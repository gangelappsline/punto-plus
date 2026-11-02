import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronDown,
  Gift,
  MapPin,
  QrCode,
  Search,
  ScanLine,
  Store,
} from 'lucide-react';
import { useCards, useNearMe, usePromotions } from '../lib/queries';
import type { LoyaltyCard as Card, Promotion } from '../lib/types';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { PromotionCard } from '../components/PromotionCard';
import { Button } from '../components/ui/button';
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

const formatNearbyDistance = (distanceKm?: number) => {
  if (distanceKm === undefined || !Number.isFinite(distanceKm)) return 'Distancia no disponible';
  if (distanceKm < 0.05) return 'Muy cerca';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
};

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
      <div className="page-intro customer-cards-intro mt-6">
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
          <span className="muted">{filtered.length} promociones</span>
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
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const businessesQuery = useNearMe(position);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'loading' | 'ready' | 'denied' | 'unavailable'
  >('idle');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const businesses = (businessesQuery.data || []).filter((business) =>
    matches(
      `${business.name} ${business.category} ${business.location} ${business.address || ''}`,
      search,
    ),
  );
  const selected =
    businesses.find((business) => business.id === selectedBusinessId) || businesses[0];
  const selectedCoordinates =
    selected?.latitude !== undefined && selected.longitude !== undefined
      ? `${selected.latitude},${selected.longitude}`
      : null;
  const centerCoordinates = position ? `${position.latitude},${position.longitude}` : null;
  const query =
    selectedCoordinates ||
    (selected
      ? `${selected.name}, ${selected.address || selected.location}, Ciudad de México`
      : centerCoordinates || 'negocios Punto Plus en Ciudad de México');
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  const mapCoordinates = selectedCoordinates || centerCoordinates;
  const [mapLatitude, mapLongitude] = mapCoordinates?.split(',').map(Number) || [];
  const mapUrl = googleMapsApiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(googleMapsApiKey)}&q=${encodeURIComponent(query)}&zoom=14`
    : mapCoordinates && mapLatitude !== undefined && mapLongitude !== undefined
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
          `${(mapLongitude - 0.02).toFixed(5)},${(mapLatitude - 0.015).toFixed(5)},${(mapLongitude + 0.02).toFixed(5)},${(mapLatitude + 0.015).toFixed(5)}`,
        )}&layer=mapnik&marker=${encodeURIComponent(mapCoordinates)}`
      : null;
  const externalMapQuery =
    selectedCoordinates ||
    `${selected?.name || 'negocios Punto Plus'}, ${selected?.address || selected?.location || 'Ciudad de México'}`;
  const externalMapUrl = selected
    ? position
      ? `https://www.google.com/maps/dir/?api=1&origin=${position.latitude},${position.longitude}&destination=${encodeURIComponent(externalMapQuery)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(externalMapQuery)}`
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
          <p>Encuentra los negocios participantes y consulta su ubicación en el mapa.</p>
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
          {locationStatus === 'idle' ? (
            <div className="customer-map-placeholder" role="status">
              <div>
                <MapPin size={22} />
                <p>Usa tu ubicación para buscar negocios cercanos.</p>
              </div>
            </div>
          ) : locationStatus === 'loading' || businessesQuery.isPending ? (
            <div className="customer-map-placeholder" role="status">
              {locationStatus === 'loading' ? 'Obteniendo tu ubicación…' : 'Cargando negocios…'}
            </div>
          ) : locationStatus === 'denied' || locationStatus === 'unavailable' ? (
            <div className="customer-map-placeholder" role="status">
              Permite el acceso a tu ubicación para buscar negocios cercanos.
            </div>
          ) : businessesQuery.isError ? (
            <div className="customer-map-placeholder">
              <QueryState loading={false} error retry={() => void businessesQuery.refetch()} />
            </div>
          ) : !mapUrl ? (
            <div className="customer-map-placeholder" role="status">
              No hay coordenadas disponibles para mostrar el mapa.
            </div>
          ) : (
            <iframe
              className="customer-google-map"
              title={`${googleMapsApiKey ? 'Google Maps' : 'Mapa'}: ${selected?.name || 'negocios Punto Plus'}`}
              src={mapUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          )}
          <p className="map-data-note">
            {googleMapsApiKey
              ? 'La ubicación se muestra en Google Maps. Si el negocio no tiene coordenadas, su marcador puede ser aproximado.'
              : 'El mapa se muestra con OpenStreetMap. Se centra en el negocio cuando hay coordenadas disponibles; si no, usa tu ubicación.'}
          </p>
        </div>
        <section className="customer-map-businesses" aria-label="Negocios cercanos">
          <div className="section-title">
            <h2>Negocios cercanos</h2>
            <span className="count-badge">{businesses.length}</span>
          </div>
          {locationStatus === 'idle' ? (
            <p>Activa tu ubicación para ver los negocios cercanos.</p>
          ) : locationStatus === 'loading' ? (
            <p role="status">Obteniendo tu ubicación…</p>
          ) : locationStatus === 'denied' || locationStatus === 'unavailable' ? (
            <p>Se necesita tu ubicación para cargar los negocios cercanos.</p>
          ) : businessesQuery.isPending ? (
            <p role="status">Cargando negocios cercanos…</p>
          ) : businessesQuery.isError ? (
            <EmptyState
              title="No pudimos cargar los negocios"
              description="Comprueba tu conexión e inténtalo de nuevo."
            >
              <Button variant="outline" onClick={() => void businessesQuery.refetch()}>
                Volver a intentar
              </Button>
            </EmptyState>
          ) : !businesses.length ? (
            <EmptyState
              title={search ? 'No encontramos negocios' : 'No hay negocios cercanos'}
              description={
                search
                  ? 'Prueba con otro nombre o categoría.'
                  : 'Cuando haya negocios participantes cerca de ti, aparecerán aquí.'
              }
            />
          ) : (
            <div className="customer-map-business-list">
              {businesses.map((business) => (
                <button
                  key={business.id}
                  type="button"
                  className={`customer-map-business${selected?.id === business.id ? ' selected' : ''}`}
                  aria-pressed={selected?.id === business.id}
                  onClick={() => setSelectedBusinessId(business.id)}
                >
                  <span className="business-avatar">
                    {business.logo ? (
                      <img src={business.logo} alt="" />
                    ) : (
                      <Store size={18} aria-hidden="true" />
                    )}
                  </span>
                  <span className="customer-map-business-copy">
                    <strong>{business.name}</strong>
                    <small>
                      {business.category}
                      {business.address ? ` · ${business.address}` : ''}
                    </small>
                    <small>
                      {business.hasCard
                        ? 'Ya tienes tarjeta'
                        : `${business.activeLoyaltyCardsCount} tarjeta${business.activeLoyaltyCardsCount === 1 ? '' : 's'} activa${business.activeLoyaltyCardsCount === 1 ? '' : 's'}`}
                      {business.activePromotionsCount > 0
                        ? ` · ${business.activePromotionsCount} ${business.activePromotionsCount === 1 ? 'promoción' : 'promociones'}`
                        : ''}
                    </small>
                  </span>
                  <span className="customer-map-distance">
                    {formatNearbyDistance(business.distanceKm)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
