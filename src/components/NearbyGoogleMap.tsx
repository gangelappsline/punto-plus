import { useEffect, useRef, useState } from 'react';
import {
  googleMapsApiKey,
  googleMapsEmbedUrl,
  hasGoogleMapsApiKey,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
} from '../lib/googleMaps';
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
 * Estado del mapa:
 * - `loading`: cargando la Maps JavaScript API.
 * - `ready`: mapa interactivo de Google con pines de los negocios.
 * - `embed`: la clave no sirve para la Maps JavaScript API; se muestra el mapa
 *   incrustado de Google (Maps Embed API) con la misma clave.
 * - `missing-key`: no hay `VITE_GOOGLE_MAPS_API_KEY`; se muestra un aviso.
 */
type MapStatus = 'loading' | 'ready' | 'embed' | 'missing-key';

/**
 * Mapa de "Cerca de mí" **siempre con Google Maps**: marcadores redondeados con
 * el logo del negocio y clic para abrir su información.
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
  const [status, setStatus] = useState<MapStatus>(hasGoogleMapsApiKey ? 'loading' : 'missing-key');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const handlersRef = useRef(new Map<string, { business: NearbyBusiness; handler: () => void }>());
  handlersRef.current = new Map(
    businesses.map((business) => [
      business.id,
      { business, handler: () => onSelectRef.current(business) },
    ]),
  );
  const failedStatusRef = useRef<MapStatus>('embed');
  failedStatusRef.current = hasGoogleMapsApiKey ? 'embed' : 'missing-key';

  // Crea el mapa de Google una sola vez, cuando la Maps JavaScript API está lista.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!hasGoogleMapsApiKey || !container) return;
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
        if (!cancelled) setStatus(failedStatusRef.current);
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

  // Si Google rechaza la clave, se pasa al mapa incrustado (sigue siendo Google).
  useEffect(() => {
    if (!hasGoogleMapsApiKey) return;
    return onGoogleMapsAuthFailure(() => setStatus(failedStatusRef.current));
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

  // Respaldo con Google Maps Embed: mismo proveedor, sin pines personalizados.
  const anchor = userPosition ?? (businesses.find(hasCoordinates) as MapCoordinates | undefined);
  const embedQuery = anchor
    ? `${anchor.latitude},${anchor.longitude}`
    : businesses[0]?.address || businesses[0]?.location || 'Ciudad de México';
  const embedUrl =
    status === 'embed'
      ? googleMapsEmbedUrl({
          apiKey: googleMapsApiKey,
          query: embedQuery,
          zoom: businesses.filter(hasCoordinates).length <= 1 ? 16 : 14,
        })
      : null;

  return (
    <>
      {status !== 'missing-key' && (
        <div
          className="nearby-map-canvas"
          ref={containerRef}
          hidden={status !== 'loading' && status !== 'ready'}
          aria-label="Mapa de negocios cercanos"
          aria-busy={status === 'loading'}
        />
      )}
      {embedUrl && (
        <iframe
          className="nearby-map-canvas nearby-map-iframe"
          title="Mapa de negocios cercanos"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
      {status === 'loading' && (
        <div className="nearby-map-fallback" role="status">
          <p>Cargando el mapa…</p>
        </div>
      )}
      {status === 'missing-key' && (
        <div className="nearby-map-fallback" role="status">
          <p>No pudimos cargar el mapa de Google Maps.</p>
          <small>Puedes consultar los negocios cercanos en la lista de abajo.</small>
        </div>
      )}
    </>
  );
}
