import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NearbyBusiness } from '../lib/types';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

const FALLBACK_CENTER: MapCoordinates = { latitude: 19.4326, longitude: -99.1332 };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const hasCoordinates = (
  business: NearbyBusiness,
): business is NearbyBusiness & { latitude: number; longitude: number } =>
  typeof business.latitude === 'number' && typeof business.longitude === 'number';

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || 'P';

/**
 * Marcador redondeado: fondo blanco, anillo de marca y el logo del negocio.
 * Si el negocio no tiene logo se muestra su inicial.
 */
function businessIcon(business: NearbyBusiness) {
  const logo = business.logo
    ? `<img src="${escapeHtml(business.logo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
    : '';
  return L.divIcon({
    className: 'pp-map-marker',
    html: `<span class="pp-map-pin">
        <span class="pp-map-pin-bubble">${logo}<b aria-hidden="true">${escapeHtml(initialOf(business.name))}</b></span>
        <span class="pp-map-pin-tail" aria-hidden="true"></span>
      </span>`,
    iconSize: [54, 64],
    iconAnchor: [27, 62],
  });
}

const userIcon = () =>
  L.divIcon({
    className: 'pp-map-marker pp-map-marker-user',
    html: '<span class="pp-map-user"><span></span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/**
 * Mapa de "Cerca de mí" basado en Leaflet + OpenStreetMap.
 *
 * Se usa un mapa real (no un iframe) porque los marcadores deben mostrar el
 * logo de cada negocio y responder al clic para abrir su información.
 */
export function NearbyMap({
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
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const businessesByIdRef = useRef(new Map<string, NearbyBusiness>());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const fittedKeyRef = useRef('');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  businessesByIdRef.current = new Map(businesses.map((business) => [business.id, business]));

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container, {
      center: [FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer?.observe(container);

    return () => {
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markersRef.current.clear();
      businessesByIdRef.current.clear();
      userMarkerRef.current = null;
      fittedKeyRef.current = '';
    };
  }, []);

  // Los marcadores solo se recrean cuando cambia la lista de negocios: así el
  // clic, el foco y el hover sobreviven a la apertura del modal.
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    businesses.filter(hasCoordinates).forEach((business) => {
      const marker = L.marker([business.latitude, business.longitude], {
        icon: businessIcon(business),
        title: business.name,
        alt: business.name,
        riseOnHover: true,
      });
      marker.on('click', () => {
        const current = businessesByIdRef.current.get(business.id);
        if (current) onSelectRef.current(current);
      });
      marker.addTo(layer);
      markersRef.current.set(business.id, marker);
    });
  }, [businesses]);

  // Resalta el marcador del negocio abierto cambiando solo su clase, sin
  // recrear el icono: el foco y el hover del marcador se conservan.
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const active = id === selectedId;
      marker.getElement()?.firstElementChild?.classList.toggle('is-active', active);
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [businesses, selectedId]);

  // Posición del cliente: punto azul con pulso.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (!userPosition) return;
    userMarkerRef.current = L.marker([userPosition.latitude, userPosition.longitude], {
      icon: userIcon(),
      interactive: false,
      keyboard: false,
      zIndexOffset: -100,
    }).addTo(map);
  }, [userPosition]);

  // Encuadra el mapa cuando cambian los negocios o la ubicación del cliente.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = businesses
      .filter(hasCoordinates)
      .map((business) => [business.latitude, business.longitude] as [number, number]);
    if (userPosition) points.push([userPosition.latitude, userPosition.longitude]);
    const key = points.map((point) => point.join(',')).join('|');
    if (!key || key === fittedKeyRef.current) {
      if (!key && center) map.setView([center.latitude, center.longitude], map.getZoom() ?? 14);
      return;
    }
    fittedKeyRef.current = key;
    if (points.length === 1) {
      map.setView(points[0], 16, { animate: false });
      return;
    }
    map.fitBounds(L.latLngBounds(points).pad(0.22), { animate: false, maxZoom: 16 });
  }, [businesses, center, userPosition]);

  return (
    <div className="nearby-map-canvas" ref={containerRef} aria-label="Mapa de negocios cercanos" />
  );
}
