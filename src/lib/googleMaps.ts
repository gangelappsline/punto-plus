/**
 * Carga de la API JavaScript de Google Maps.
 *
 * El proyecto ya venía usando Google Maps para "Cerca de mí"; ahora se usa la
 * Maps JavaScript API (no el iframe del Embed API) porque permite marcadores
 * personalizados con el logo del negocio y un clic que abre su información.
 *
 * La clave es la misma variable pública `VITE_GOOGLE_MAPS_API_KEY`, pero la
 * clave debe tener habilitada **Maps JavaScript API**, no solo Maps Embed API.
 */

export const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

export const hasGoogleMapsApiKey = googleMapsApiKey.length > 0;

export type GoogleMapsFailure = 'missing-key' | 'load-failed';

let loaderPromise: Promise<typeof google.maps> | null = null;

function loadedMaps() {
  return (window as unknown as { google?: typeof google }).google?.maps;
}

/** Carga (una sola vez) el script de Google Maps y devuelve el namespace `maps`. */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === 'undefined') return Promise.reject(new Error('load-failed'));
  const ready = loadedMaps();
  if (ready) return Promise.resolve(ready);
  if (!hasGoogleMapsApiKey) return Promise.reject(new Error('missing-key'));
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const finishWithError = () => {
      loaderPromise = null;
      script.remove();
      reject(new Error('load-failed'));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleMapsApiKey,
    )}&v=weekly&language=es&region=MX&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.addEventListener('load', () => {
      const maps = loadedMaps();
      if (maps) resolve(maps);
      else finishWithError();
    });
    script.addEventListener('error', finishWithError);
    document.head.appendChild(script);
  });
  return loaderPromise;
}
