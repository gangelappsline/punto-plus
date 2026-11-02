/**
 * Google Maps para la sección "Cerca de mí".
 *
 * Todo el mapa se dibuja con Google Maps, sin proveedores alternativos:
 *
 * 1. **Maps JavaScript API** (principal): mapa interactivo con marcadores
 *    propios (el pin redondeado con el logo del negocio) y clic para abrir la
 *    información.
 * 2. **Maps Embed API** (respaldo): si la clave no tiene habilitada la Maps
 *    JavaScript API o el script no carga, se muestra el mapa incrustado de
 *    Google con la misma clave. Sigue siendo Google Maps, solo sin pines
 *    personalizados.
 *
 * La clave es `VITE_GOOGLE_MAPS_API_KEY`; conviene que tenga habilitadas ambas
 * APIs para que el respaldo también funcione.
 */

import { Loader } from '@googlemaps/js-api-loader';

export const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

export const hasGoogleMapsApiKey = googleMapsApiKey.length > 0;

export type GoogleMapsFailure = 'missing-key' | 'load-failed';

let loader: Loader | null = null;
let loaderPromise: Promise<typeof google.maps> | null = null;

function loadedMaps() {
  return (window as unknown as { google?: typeof google }).google?.maps;
}

/** Carga (una sola vez) la Maps JavaScript API y devuelve el namespace `maps`. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') return Promise.reject(new Error('load-failed'));
  const ready = loadedMaps();
  if (ready) return Promise.resolve(ready);
  if (!hasGoogleMapsApiKey) return Promise.reject(new Error('missing-key'));
  if (loaderPromise) return loaderPromise;

  loader ??= new Loader({
    apiKey: googleMapsApiKey,
    version: 'weekly',
    language: 'es',
    region: 'MX',
  });

  loaderPromise = loader
    .importLibrary('maps')
    .then(() => {
      const maps = loadedMaps();
      if (!maps) throw new Error('load-failed');
      return maps;
    })
    .catch((error: unknown) => {
      // Se permite reintentar (por ejemplo al desplegar la clave correcta).
      loaderPromise = null;
      loader = null;
      throw error;
    });

  return loaderPromise;
}

const authFailureListeners = new Set<() => void>();
let authFailureWatching = false;

/**
 * Google llama a `window.gm_authFailure` cuando la clave no es válida para la
 * Maps JavaScript API (clave restringida, API no habilitada, facturación, etc.).
 * En ese caso conviene pasar al mapa incrustado.
 */
export function onGoogleMapsAuthFailure(listener: () => void) {
  authFailureListeners.add(listener);
  if (!authFailureWatching && typeof window !== 'undefined') {
    authFailureWatching = true;
    const globalWindow = window as unknown as { gm_authFailure?: () => void };
    const previous = globalWindow.gm_authFailure;
    globalWindow.gm_authFailure = () => {
      previous?.();
      authFailureListeners.forEach((notify) => notify());
    };
  }
  return () => {
    authFailureListeners.delete(listener);
  };
}

/** URI del mapa incrustado de Google Maps (Maps Embed API). */
export function googleMapsEmbedUrl({
  apiKey = googleMapsApiKey,
  query,
  zoom = 15,
}: {
  apiKey?: string;
  query: string;
  zoom?: number;
}) {
  if (!apiKey || !query.trim()) return null;
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    zoom: String(zoom),
    language: 'es',
    region: 'MX',
  });
  return `https://www.google.com/maps/embed/v1/search?${params.toString()}`;
}
