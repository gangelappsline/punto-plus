import { useEffect, useRef, useState } from 'react';
import { hasGoogleMapsApiKey, loadGoogleMaps } from '../lib/googleMaps';
import type { NearbyBusiness } from '../lib/types';
import { createBusinessPin, createUserDot, hasCoordinates, type MapCoordinates } from './nearbyPin';

const FALLBACK_CENTER: MapCoordinates = { latitude: 19.4326, longitude: -99.1332 };

/** Estilo sobrio para que el mapa no compita con los marcadores. */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#e4ebf0' }] },
  { featureType: 'landscape', stylers: [{ color: '#f4f7f8' }] },
  { featureType: 'water', stylers: [{ color: '#d8e8ea' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
];

type PinOverlay = google.maps.OverlayView & {
  setPoint: (coordinates: MapCoordinates) => void;
  element: HTMLElement;
};

/**
 * Capa propia sobre el mapa para colocar HTML libre (el pin con el logo).
 * `google.maps.OverlayView` se instancia después de cargar la API, por eso la
 * clase se crea en la primera llamada.
 */
function createOverlayFactory() {
  let Base: typeof google.maps.OverlayView | null = null;

  return function overlayFactory(
    coordinates: MapCoordinates,
    element: HTMLElement,
    anchor: { x: number; y: number },
  ): PinOverlay {
    Base ??= class extends google.maps.OverlayView {
      element: HTMLElement;

      private point: google.maps.LatLng;

      private anchor: { x: number; y: number };

      constructor() {
        super();
        this.element = element;
        this.anchor = anchor;
        this.point = new google.maps.LatLng(coordinates.latitude, coordinates.longitude);
      }

      onAdd() {
        this.element.style.position = 'absolute';
        this.getPanes()?.overlayMouseTarget.appendChild(this.element);
      }

      draw() {
        const projection = this.getProjection();
        const pixel = projection?.fromLatLngToDivPixel(this.point);
        if (!pixel) return;
        this.element.style.left = `${pixel.x - this.anchor.x}px`;
        this.element.style.top = `${pixel.y - this.anchor.y}px`;
      }

      onRemove() {
        this.element.remove();
      }

      setPoint(next: MapCoordinates) {
        this.point = new google.maps.LatLng(next.latitude, next.longitude);
        this.draw();
      }
    };

    return new Base() as PinOverlay;
  };
}

const overlayFactory = createOverlayFactory();

const toLatLng = ({ latitude, longitude }: MapCoordinates) => ({ lat: latitude, lng: longitude });

/**
 * Respaldo cuando Google Maps no está configurado o no carga: un mapa
 * incrustado de OpenStreetMap para no dejar la sección vacía. Los marcadores
 * con logo y el modal requieren la API JavaScript de Google.
 */
function fallbackMapUrl(businesses: NearbyBusiness[], center: MapCoordinates | null) {
  const points = businesses.filter(hasCoordinates).map((business) => ({
    latitude: business.latitude,
    longitude: business.longitude,
  }));
  if (center) points.push(center);
  if (!points.length) points.push(FALLBACK_CENTER);
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const north = Math.max(...latitudes) + 0.012;
  const south = Math.min(...latitudes) - 0.012;
  const east = Math.max(...longitudes) + 0.018;
  const west = Math.min(...longitudes) - 0.018;
  const marker = `${points[0].latitude},${points[0].longitude}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    `${west.toFixed(5)},${south.toFixed(5)},${east.toFixed(5)},${north.toFixed(5)}`,
  )}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

/**
 * Mapa de "Cerca de mí" con Google Maps: marcadores redondeados con el logo
 * del negocio y clic para abrir su información.
 */
export function NearbyGoogleMap({
  businesses,
  center,
  userPosition,
  selectedId,
  onSelect,
}: {
  businesses: NearbyBusiness[];
  center: MapCoordinates | null;
  userPosition: MapCoordinates | null;
  selectedId?: string;
  onSelect: (business: NearbyBusiness) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef(new Map<string, { overlay: PinOverlay; element: HTMLElement }>());
  const userOverlayRef = useRef<PinOverlay | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    hasGoogleMapsApiKey ? 'loading' : 'unavailable',
  );
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const handlersRef = useRef(new Map<string, { business: NearbyBusiness; handler: () => void }>());
  handlersRef.current = new Map(
    businesses.map((business) => [
      business.id,
      { business, handler: () => onSelectRef.current(business) },
    ]),
  );

  // Crea el mapa una sola vez, cuando la API de Google Maps ya está disponible.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    void loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !container) return;
        mapRef.current = new maps.Map(container, {
          center: toLatLng(center ?? FALLBACK_CENTER),
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
          clickableIcons: false,
          styles: MAP_STYLES,
          backgroundColor: '#edf3f4',
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
      markersRef.current.forEach(({ overlay }) => overlay.setMap(null));
      markersRef.current.clear();
      userOverlayRef.current?.setMap(null);
      userOverlayRef.current = null;
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
    };
    // El mapa se monta una sola vez; los cambios se aplican en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores de los negocios: se recrean solo cuando cambia la lista.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    markersRef.current.forEach(({ overlay }) => overlay.setMap(null));
    markersRef.current.clear();
    businesses.filter(hasCoordinates).forEach((business) => {
      const selection = handlersRef.current.get(business.id);
      const element = createBusinessPin(business, () => selection?.handler());
      const overlay = overlayFactory(
        { latitude: business.latitude, longitude: business.longitude },
        element,
        { x: 27, y: 58 },
      );
      overlay.setMap(map);
      markersRef.current.set(business.id, { overlay, element });
    });
  }, [businesses, status]);

  // Resalta el marcador abierto sin recrear los pines (conserva foco y hover).
  useEffect(() => {
    markersRef.current.forEach(({ element }, id) => {
      element.classList.toggle('is-active', id === selectedId);
    });
  }, [businesses, selectedId, status]);

  // Punto de la ubicación del cliente.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    userOverlayRef.current?.setMap(null);
    userOverlayRef.current = null;
    if (!userPosition) return;
    const element = createUserDot();
    userOverlayRef.current = overlayFactory(userPosition, element, { x: 12, y: 12 });
    userOverlayRef.current.setMap(map);
  }, [userPosition, status]);

  // Encuadra todos los negocios y la posición del cliente.
  useEffect(() => {
    const map = mapRef.current;
    const maps = (window as unknown as { google?: typeof google }).google?.maps;
    if (!map || !maps || status !== 'ready') return;
    const points = businesses.filter(hasCoordinates).map((business) => toLatLng(business));
    if (userPosition) points.push(toLatLng(userPosition));
    if (!points.length) {
      if (center) map.setCenter(toLatLng(center));
      return;
    }
    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(16);
      return;
    }
    const bounds = new maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, { top: 110, right: 60, bottom: 130, left: 60 });
  }, [businesses, center, userPosition, status]);

  const fallbackUrl =
    status === 'unavailable' ? fallbackMapUrl(businesses, userPosition ?? center) : null;

  return (
    <>
      <div
        className="nearby-map-canvas"
        ref={containerRef}
        hidden={status === 'unavailable'}
        aria-label="Mapa de negocios cercanos"
        aria-busy={status === 'loading'}
      />
      {fallbackUrl && (
        <iframe
          className="nearby-map-canvas nearby-map-iframe"
          title="Mapa de negocios cercanos"
          src={fallbackUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      {status === 'loading' && (
        <div className="nearby-map-fallback" role="status">
          <p>Cargando el mapa…</p>
        </div>
      )}
    </>
  );
}
